var AlarmsResourcesService = (function() {

  var logger = Logger.get('AlarmsResourcesService');
  var state = null;


  var enrichState = function(data) {

    logger.debug("enrichState");

    state.access.comm.channel['reconnectRetries'] = data.comms.reconnectRetries;
    state.access.comm.channel['reconnectTimeWait'] = data.comms.reconnectTimeWait;
    state.access.comm.channel['heartbeatFrecuency'] = data.comms.heartbeatFrecuency;
    state.access['useVerifiedState'] = data.useVerifiedState;

    state.ui['locale'] = {};

    state.ui.locale['current'] = data.locale.current;
    state.ui.locale['available'] = data.locale.available;

    var searchableFields = data.fields.columns.map( function(a) {
      if (a.hasOwnProperty("searchable") && a.searchable) { 
        var searchableField = {field: a.field, caption: a.caption, type: a.type};
        if (a.options) {
          searchableField['options'] = a.options;
        }
        if (a.searchOperator) {
          searchableField['operator'] = a.searchOperator;
        }
        return searchableField;
      } else {
        return null;
      }
    }).filter( function(element) {
      return !(element == null);
    });

    state.alarms = {};
    state.alarms['filters'] = {};
    state.alarms.filters['searchableFields'] = searchableFields;

    for (var i = 0, len = data.fields.columns.length; i < len; i++) {
      delete data.fields.columns[i].type;
      if (data.fields.columns[i].options) {
        delete data.fields.columns[i].options;
      }
    }

    state.alarms['fields'] = data.fields.columns;
    state.alarms['sortCriteria'] = data.fields.initialSortCriteria;
    state.alarms['buttons'] = data.buttons;
    if (data.useVerifiedState) {
      state.alarms.buttons['verify'] = true;
    }
    state.ui['sounds'] = data.sounds;
  }


  var loadDefaultConfiguration = function() {

    logger.debug("loadDefaultConfiguration");

    var configUrl =  "http://" +
      state.access.comm.resources.hostname + ":" +
      state.access.comm.resources.port + "/" +
      state.access.comm.resources.servicePath;

    logger.debug("Requesting configuration to: " + configUrl);

    $.ajax({
      async: false,
      url: configUrl,
      crossDomain: true,
      data: {
        operation: 'get',
        file: state.access.comm.resources.confFile
      }
    })
    .done( function(data) {
      logger.debug("success");
      enrichState(data);
    })
    .fail( function() {
      logger.debug("Error loading default configuration.");
    })
    .always( function() {
      logger.debug("complete");
    });
  }


  var loadConfiguration = function() {

    logger.debug("loadConfiguration");

    var configUrl =  "http://" +
      state.access.comm.resources.hostname + ":" +
      state.access.comm.resources.port + "/" +
      state.access.comm.resources.servicePath;

    logger.debug("Requesting configuration to: " + configUrl);

    $.ajax({
      async: false,
      url: configUrl,
      crossDomain: true,
      data: {
        operation: 'get',
        file: state.access.comm.resources.confFile
      }
    })
    .done( function(data) {
      logger.debug("success");
      enrichState(data);
    })
    .fail( function() {
      logger.debug("Error loading configuration. Trying to get default configuration");
      loadDefaultConfiguration();
    })
    .always( function() {
      logger.debug("complete");
    });
  }  


  return {
    init: function(store) {
      logger.debug("init");
      state = store.getState();
      loadConfiguration();
      state.ui.messageBus.trigger('AlarmsResourcesService:resourcesLoaded');
    }
  }

})();

