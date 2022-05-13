var StatisticsView = (function() {

  var logger = Logger.get('StatisticsView');
  var state = null;

  var REC_ACT = 0;
  var REC_VER = 1;
  var REC_CLR = 2;
  var REC_ACK = 3;
  var REC_TOT = 4;

  var counters = new Array(5);
  counters['ACT_CNT'] = new Array(5);
  counters['VER_CNT'] = new Array(5);
  counters['CLR_CNT'] = new Array(5);
  counters['ACK_CNT'] = new Array(5);
  counters['TOT_ST_CNT'] = new Array(5);

  //
  //
  //
  var createWidget = function() {
    logger.debug("createWidget");
    state.ui.statistics = $().w2grid({
      name: 'statistics', 
      multiSelect: false,
      show: {
        emptyRecords   : false,
        toolbarReload  : false,
        toolbarColumns : false,
        toolbarSearch  : false,
        toolbarInput   : false,
        searchAll      : false,
        toolbarAdd     : false,
        toolbarEdit    : false,
        toolbarDelete  : false,
        toolbarSave    : false,
        selectionBorder: false,
        recordTitles   : false,
        skipRecords    : false
      },
      columns: [
        { field: 'dummy', size: '20%', caption: '', type: 'int', attr: 'align=center' },
        { field: 'crit', size: '20%', caption: 'CRIT', type: 'int', attr: 'align=right' },
        { field: 'maj', size: '20%', caption: 'MAJ', type: 'int', attr: 'align=right'},
        { field: 'min', size: '20%', caption: 'MIN', type: 'int', attr: 'align=right'},
        { field: 'warn', size: '20%', caption: 'WARN', type: 'int', attr: 'align=right'},
        { field: 'total', size: '20%', caption: '', type: 'int', attr: 'align=right'}
      ],
      records: [
        { recid: 1, dummy: 'ACT', crit: '0', maj: '0', min: '0', warn: '0', total: '0' },
        { recid: 2, dummy: 'VER', crit: '0', maj: '0', min: '0', warn: '0', total: '0' },
        { recid: 3, dummy: 'CLR', crit: '0', maj: '0', min: '0', warn: '0', total: '0' },
        { recid: 4, dummy: 'ACK', crit: '0', maj: '0', min: '0', warn: '0', total: '0' },
        { recid: 5, dummy: '', crit: '0', maj: '0', min: '0', warn: '0', total: '0' }
      ],
      onClick: function(e) {
        logger.debug("onClick");
        e.preventDefault();
      },
      onDblClick: function(e) {
        logger.debug("onDblClick");
        e.preventDefault();
      },
      onSelect: function(e) {
        logger.debug("onSelect");
        e.preventDefault();
      },
      onUnselect: function(e) {
        logger.debug("onUnselect");
        e.preventDefault();
      }
    });

    if (!state.access.useVerifiedState) {
      state.ui.statistics.records[1].w2ui = {class: "off"};
    }
  };

  //
  //
  //
  var resetCounters = function() {
    logger.debug("resetCounters");
    counters['ACT_CNT']['CRIT_CNT'] = 0;
    counters['ACT_CNT']['MAJ_CNT'] = 0;
    counters['ACT_CNT']['MIN_CNT'] = 0;
    counters['ACT_CNT']['WARN_CNT'] = 0;
    counters['ACT_CNT']['TOT_ACT_CNT'] = 0;
    counters['VER_CNT']['CRIT_CNT'] = 0;
    counters['VER_CNT']['MAJ_CNT'] = 0;
    counters['VER_CNT']['MIN_CNT'] = 0;
    counters['VER_CNT']['WARN_CNT'] = 0;
    counters['VER_CNT']['TOT_VER_CNT'] = 0;
    counters['CLR_CNT']['CRIT_CNT'] = 0;
    counters['CLR_CNT']['MAJ_CNT'] = 0;
    counters['CLR_CNT']['MIN_CNT'] = 0;
    counters['CLR_CNT']['WARN_CNT'] = 0;
    counters['CLR_CNT']['TOT_CLR_CNT'] = 0;
    counters['ACK_CNT']['CRIT_CNT'] = 0;
    counters['ACK_CNT']['MAJ_CNT'] = 0;
    counters['ACK_CNT']['MIN_CNT'] = 0;
    counters['ACK_CNT']['WARN_CNT'] = 0;
    counters['ACK_CNT']['TOT_ACK_CNT'] = 0;
    counters['TOT_ST_CNT']['TOT_CRIT_CNT'] = 0;
    counters['TOT_ST_CNT']['TOT_MAJ_CNT'] = 0;
    counters['TOT_ST_CNT']['TOT_MIN_CNT'] = 0;
    counters['TOT_ST_CNT']['TOT_WARN_CNT'] = 0;
    counters['TOT_ST_CNT']['TOT_ST_CNT'] = 0;
  };

  //
  //
  //
  var partialCountersUpdate = function (newAlarm, oldAlarm) {
    logger.debug("partialCountersUpdate");
    if (oldAlarm) {
      var oldSeverity = oldAlarm.estado;
      var oldLevel = oldAlarm.nivel;
      var newSeverity = newAlarm.estado;
      var newLevel = newAlarm.nivel;
      counters[oldSeverity + '_CNT'][oldLevel + '_CNT']--;
      counters[oldSeverity + '_CNT']['TOT_' + oldSeverity + '_CNT']--;
      counters['TOT_ST_CNT']['TOT_' + oldLevel + '_CNT']--;
      counters['TOT_ST_CNT']['TOT_ST_CNT']--;
      counters[newSeverity + '_CNT'][newLevel + '_CNT']++;
      counters[newSeverity + '_CNT']['TOT_' + newSeverity + '_CNT']++;
      counters['TOT_ST_CNT']['TOT_' + newLevel + '_CNT']++;
      counters['TOT_ST_CNT']['TOT_ST_CNT']++;
    } else {
      var severity = newAlarm.estado;
      var level = newAlarm.nivel;
      counters[severity + '_CNT'][level + '_CNT']++;
      counters[severity + '_CNT']['TOT_' + severity + '_CNT']++;
      counters['TOT_ST_CNT']['TOT_' + level + '_CNT']++;
      counters['TOT_ST_CNT']['TOT_ST_CNT']++;
    }
  };

  //
  //
  //
  var globalCountersUpdate = function (thereIsFilterActive) {
    logger.debug("globalCountersUpdate");
    resetCounters();
    var recordIds = state.ui.alarms.last.searchIds;
    if (recordIds.length > 0) {
      for (var i = 0; i < recordIds.length; i++) {
        var severity = state.ui.alarms.records[recordIds[i]].estado;
        var level = state.ui.alarms.records[recordIds[i]].nivel;
        counters[severity + '_CNT'][level + '_CNT']++;
        counters[severity + '_CNT']['TOT_' + severity + '_CNT']++;
        counters['TOT_ST_CNT']['TOT_' + level + '_CNT']++;
        counters['TOT_ST_CNT']['TOT_ST_CNT']++;
      }
    } else {
      if (!thereIsFilterActive) {
        var records = state.ui.alarms.records;
        for (var i = 0; i < records.length; i++) {
          var severity = records[i].estado;
          var level = records[i].nivel;
          counters[severity + '_CNT'][level + '_CNT']++;
          counters[severity + '_CNT']['TOT_' + severity + '_CNT']++;
          counters['TOT_ST_CNT']['TOT_' + level + '_CNT']++;
          counters['TOT_ST_CNT']['TOT_ST_CNT']++;
        }
      }
    }
    render();
  };

  //
  //
  //
  var render = function() {
    logger.debug("render");
    state.ui.statistics.records[REC_ACT] =
      $.extend({}, state.ui.statistics.records[REC_ACT],
        {
          crit: counters['ACT_CNT']['CRIT_CNT'],
          maj: counters['ACT_CNT']['MAJ_CNT'],
          min: counters['ACT_CNT']['MIN_CNT'],
          warn: counters['ACT_CNT']['WARN_CNT'],
          total: counters['ACT_CNT']['TOT_ACT_CNT']
        }
      );
    state.ui.statistics.records[REC_VER] =
      $.extend({}, state.ui.statistics.records[REC_VER],
        {
          crit: counters['VER_CNT']['CRIT_CNT'],
          maj: counters['VER_CNT']['MAJ_CNT'],
          min: counters['VER_CNT']['MIN_CNT'],
          warn: counters['VER_CNT']['WARN_CNT'],
          total: counters['VER_CNT']['TOT_VER_CNT']
        }
      );
    state.ui.statistics.records[REC_CLR] =
      $.extend({}, state.ui.statistics.records[REC_CLR],
        {
          crit: counters['CLR_CNT']['CRIT_CNT'],
          maj: counters['CLR_CNT']['MAJ_CNT'],
          min: counters['CLR_CNT']['MIN_CNT'],
          warn: counters['CLR_CNT']['WARN_CNT'],
          total: counters['CLR_CNT']['TOT_CLR_CNT']
        }
      );
    state.ui.statistics.records[REC_ACK] =
      $.extend({}, state.ui.statistics.records[REC_ACK],
        {
          crit: counters['ACK_CNT']['CRIT_CNT'],
          maj: counters['ACK_CNT']['MAJ_CNT'],
          min: counters['ACK_CNT']['MIN_CNT'],
          warn: counters['ACK_CNT']['WARN_CNT'],
          total: counters['ACK_CNT']['TOT_ACK_CNT']
        }
    );
    state.ui.statistics.records[REC_TOT] =
      $.extend({}, state.ui.statistics.records[REC_TOT],
        {
          crit: counters['TOT_ST_CNT']['TOT_CRIT_CNT'],
          maj: counters['TOT_ST_CNT']['TOT_MAJ_CNT'],
          min: counters['TOT_ST_CNT']['TOT_MIN_CNT'],
          warn: counters['TOT_ST_CNT']['TOT_WARN_CNT'],
          total: counters['TOT_ST_CNT']['TOT_ST_CNT']
        }
      );
    state.ui.statistics.refresh();
  };

  //
  //
  //
  return {
    init: function(store) {
      logger.debug("init");
      state = store.getState();
      state.ui.messageBus.bind('FilterManagementView:ready', function() {
        createWidget();
        resetCounters();
        state.ui.messageBus.trigger('StatisticsView:ready');
        state.ui.messageBus.unbind('FilterManagementView:ready');
      });
      state.ui.messageBus.bind('AlarmsView:alarmsSearch', function(thereIsFilterActive) {
        globalCountersUpdate(thereIsFilterActive);
      });
    },
    partialUpdate: function(newAlarm, oldAlarm) {
      logger.debug("partialUpdate");
      partialCountersUpdate(newAlarm, oldAlarm);
    },
    render: function() {
      logger.debug("render");
      render();
    }
  };

})();

