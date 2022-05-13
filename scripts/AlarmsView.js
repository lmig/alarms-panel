var AlarmsView = (function() {

  var logger = Logger.get('AlarmsView');
  var state = null;
  var initialFilter = null;

  var createWidget = function() {

    logger.debug("createWidget");

    state.ui.alarms = $().w2grid({
      name: 'alarms', 
      columns: state.alarms.fields,
      multiSelect : true,
      reorderColumns: true,
      recId: 'id',
      searches : state.alarms.filters.searchableFields,
      markSearch : false,
      toolbar: {
        items: menuConfig,
        tooltip: 'bottom',
      },
      show: {
        toolbar: true,
        toolbarReload: false,
        toolbarSearch: false,
        toolbarInput: false,
        searchAll: false,
        toolbarAdd: false,
        toolbarEdit: false,
        toolbarDelete: false,
        toolbarSave: false,
        selectionBorder: false,
        recordTitles: false,
        selectColumn: true,
        saveRestoreState: false
      },
      menu: [
          { id: 'ack', icon: 'fa fa-check-circle-o', text: w2utils.lang('Reconocer alarmas') },
          { id: 'hide', icon: 'fa fa-eye-slash', text: w2utils.lang('Ocultar alarmas') },
          { id: 'cease', icon: 'fa fa-bell-slash-o', text: w2utils.lang('Cesar alarmas') },
          { id: 'verify', icon: 'fa fa-certificate', text: w2utils.lang('Verificar alarmas') },
          { id: 'unack', icon: 'fa fa-check-circle', text: w2utils.lang('Invertir reconocer alarmas') }
      ],
      onSort: function(event) {
        logger.debug("onSort");
        setTimeout(function() {
          state.alarms.sortCriteria = {field: state.ui.alarms.sortData[0].field, direction: state.ui.alarms.sortData[0].direction};
        }, 250);
      },
      onSelect: function(event) {
        logger.debug("onSelect");
        event.onComplete = function() {
          onAlarmsSelected();
        }
      },
      onUnselect: function(event) {
        logger.debug("onUnselect");
        event.onComplete = function() {
          onAlarmsUnselected();
        }
      },
      onSearch: function(event) {
        logger.debug("onSearch");
        event.done(function() {
          onAlarmsSearch();
        });
      },
      onMenuClick: function(event) {
        logger.debug("onMenuClick");
        logger.log(event);
        switch (event.menuItem.id) {
          case 'ack':
            onAck();
          break;
          case 'hide':
            onHide();
          break;
          case 'cease':
            onCease();
          break;
          case 'verify': 
            onVerify();
          break;
          case 'unack':
            onInvAck();
          break;
          default:
          break;
        }
      }
    });

    var buttonsVisivility = state.alarms.buttons;

    for (var property in buttonsVisivility) {
      if (buttonsVisivility.hasOwnProperty(property)) {
        buttonsVisivility[property] ? state.ui.alarms.toolbar.show(property) : state.ui.alarms.toolbar.hide(property);
      }
    }

  };


  var onAlarmsSearch = function() {
    logger.debug("onAlarmsSearch");
    state.ui.messageBus.trigger('AlarmsView:alarmsSearch', (state.ui.alarms.toolbar.get('currentFilter').text) ? true : false);
  };


  var onAlarmsSelected = function() {
    logger.debug("onAlarmsSelected");
    state.ui.alarms.toolbar.enable('ack', 'hide', 'cease', 'unack');
    if (state.access.useVerifiedState) {
      state.ui.alarms.toolbar.enable('verify');
    }
  };


  var onAlarmsUnselected = function() {
    logger.debug("onAlarmsUnselected");
    var recIdxArr = state.ui.alarms.getSelection();
    if (recIdxArr.length == 0) {
      state.ui.alarms.toolbar.disable('ack', 'hide', 'cease', 'unack');
      if (state.access.useVerifiedState) {
        state.ui.alarms.toolbar.disable('verify');
      }
    }
  };


  var onRecharge = function() {
    logger.debug("onRecharge");
    state.ui.alarms.lock('Recharging...', true);
    state.ui.loading = true;
    state.ui.alarms.clear();
    state.alarms.data = [];
    state.access.comm.channel.dataReadyToSend.push(
      {recAlarmas : {usuario: state.access.user.id, fd: state.access.comm.fd}}
    );
    state.ui.messageBus.trigger('AlarmsView:dataReadyToSend');
  };


  var sendOperationCommand = function(command) {
    logger.debug("sendOperationCommand");
    setTimeout(function() {
      var recIdxArr = state.ui.alarms.getSelection();
      for (var i = 0; i < recIdxArr.length; i++) {
        recData = state.ui.alarms.get(recIdxArr[i]);
        var cmd = {};
        cmd[command] = {id: recData.id, usuario: state.access.user.id};
        state.access.comm.channel.dataReadyToSend.push(cmd);
        state.ui.messageBus.trigger('AlarmsView:dataReadyToSend');
        state.ui.alarms.unselect(recData.recid);
      }
    }, 0)
  };


  var onAck = function() {
    logger.debug("onAck");
    sendOperationCommand("reconAlarma");
  };


  var onCease = function() {
    logger.debug("onCease");
    sendOperationCommand("cesarAlarma");
  };


  var onVerify = function() {
    logger.debug("onVerify");
    sendOperationCommand("verificarAlarma");
  };


  var onInvAck = function() {
    logger.debug("onUnack");
    sendOperationCommand("invreconAlarma");
  };


  var onHide = function() {
    logger.debug("onHide");
    state.ui.alarms.delete(true);
    setTimeout( function() {
      onAlarmsSearch();
    }, 100);
  };


  var onFilter = function() {
    logger.debug("onFilter");
    w2ui['app'].toggle('right', true);
    setTimeout(function() {
      w2ui['app'].get('right').content.get('main').content.refresh();
    }, 100);
  };


  var onStatistics = function() {
    logger.debug("onStatistics");
    state.ui.alarms.toolbar.tooltipHide('statistics');
    state.ui.messageBus.trigger('AlarmsView:toogleStatistics');
  };


  var updateAlarmVolume = function() {
    logger.debug("updateAlarmVolume");
    var icon = "fa fa-volume-";
    if (state.ui.sounds.enabled) {
      icon += "up";
      state.ui.alarms.toolbar.get('vol').tooltip = 'Silenciar avisos';
    } else {
      icon += "off";
      state.ui.alarms.toolbar.get('vol').tooltip = 'Activar avisos';
    }
    state.ui.alarms.toolbar.get('vol').icon = icon;
    state.ui.alarms.toolbar.refresh('vol');
  };


  var toogleAlarmVolume = function() {
    logger.debug("toogleAlarmVolume");
    state.ui.sounds.enabled = !state.ui.sounds.enabled;
    updateAlarmVolume();
  };


  var menuConfig = [
    { type: 'button', id: 'recharge', icon: 'fa fa-refresh', tooltip: w2utils.lang('Recarga de operaciones'), onClick: onRecharge },
    { type: 'button', id: 'ack', icon: 'fa fa-check-circle-o', tooltip: w2utils.lang('Reconocer alarmas'), onClick: onAck },
    { type: 'button', id: 'hide', icon: 'fa fa-eye-slash', tooltip: w2utils.lang('Ocultar alarmas'), onClick: onHide },
    { type: 'button', id: 'cease', icon: 'fa fa-bell-slash-o', tooltip: w2utils.lang('Cesar alarmas'), onClick: onCease },
    { type: 'button', id: 'verify', icon: 'fa fa-certificate', tooltip: w2utils.lang('Verificar alarmas'), onClick: onVerify },
    { type: 'button', id: 'unack', icon: 'fa fa-check-circle', tooltip: w2utils.lang('Invertir reconocer alarmas'), onClick: onInvAck },
    { type: 'break' },
    { type: 'check', id: 'vol', icon: 'fa fa-volume-off', tooltip: 'Silenciar aviso alarma', onClick: toogleAlarmVolume },
    { type: 'check', id: 'filter', icon: 'fa fa-filter', tooltip: 'Gestion de filtros', onClick: onFilter },
    { type: 'check', id: 'statistics', icon: 'fa fa-bar-chart', tooltip: 'Panel de estadisticas', onClick: onStatistics },
    { type:'spacer' },
    { type: 'button', id: 'user', text: 'idUser', icon: 'fa fa-user', disabled: true },
    { type: 'button', id: 'profile', text: 'profile', icon: 'fa fa-id-card-o', disabled: true },
    { type: 'button', id: 'domain', text: 'domain', icon: 'fa fa-user-circle-o', disabled: true },
    { type: 'button', id: 'currentFilter', text: '', icon: 'fa fa-filter', disabled: true },
    { type: 'break' },
    { type: 'button', id: 'status', text: '', icon: 'fa fa-rss', style: 'font-weight: bold;', disabled: true },
  ];


  var renderRecord = function(record) {

    logger.debug("renderRecord");

    var done = true;

    switch (record.estado) {
      case "ACK":
        record['w2ui'] = {class: 'grid_alarms_rec_ack'};
        break;
      case "CLR":
        record['w2ui'] = {class: 'grid_alarms_rec_clr'};
        break;
      case "VER":
        if (state.access.useVerifiedState) {
          record['w2ui'] = {class: 'grid_alarms_rec_ver'};
        }
        break;
      default:
        done = false;
        break;
    }

    if (!done) {
      switch (record.nivel) {
        case "CRIT":
          record['w2ui'] = {class: 'grid_alarms_rec_crit'};
          break;
        case "MAJ":
          record['w2ui'] = {class: 'grid_alarms_rec_maj'};
          break;
        case "MIN":
          record['w2ui'] = {class: 'grid_alarms_rec_min'};
          break;                        
        case "WARN":
          record['w2ui'] = {class: 'grid_alarms_rec_warn'};
          break;
        default:
          break;
      }
    }
  };


  var renderRecords = function() {
    logger.debug("renderRecords");
    for (var i = 0; i < state.ui.alarms.records.length; i++) {
      var record = state.ui.alarms.records[i];
      renderRecord(record);
    }
  };


  var render = function() {
    logger.debug("render");
    state.ui.alarms.sort(state.alarms.sortCriteria['field'], state.alarms.sortCriteria['direction']);
    state.ui.alarms.localSearch(true);
    renderRecords();
    state.ui.alarms.reload();
    onAlarmsSearch();
  };


  var updateUserInfo = function() {
    logger.debug("updateUserInfo");
    state.ui.alarms.toolbar.get('user').text = state.access.user.id;
    state.ui.alarms.toolbar.get('profile').text = state.access.user.profile;
    state.ui.alarms.toolbar.get('domain').text = state.access.user.domain;
    state.ui.alarms.toolbar.refresh('user');
    state.ui.alarms.toolbar.refresh('profile');
    state.ui.alarms.toolbar.refresh('domain');
    state.ui.alarms.toolbar.refresh('status');
  };


  var updateStatusInfo = function(connected) {
    logger.debug("updateStatusInfo");
    var icon = "fa fa-rss ";
    if (connected) {
      icon += 'on';
    } else {
      icon += "off"
    }
    state.ui.alarms.toolbar.get('status').icon = icon;
    state.ui.alarms.toolbar.refresh('status');
  };


  return {
    init: function(store) {
      logger.debug("init");
      state = store.getState();
      state.ui.messageBus.bind('StatisticsView:ready', function() {
        createWidget();
        onAlarmsUnselected();
        if (!state.access.useVerifiedState) {
          state.ui.alarms.toolbar.hide('verify');
        }
        updateUserInfo();
        updateStatusInfo(false);
        updateAlarmVolume();
        if (initialFilter) {
          state.ui.alarms.toolbar.get('currentFilter').text = initialFilter.name;
          state.ui.alarms.toolbar.refresh('currentFilter');
          state.ui.alarms.search(initialFilter.criteria);
          initialFilter = null;
        }
        state.ui.alarms.toolbar.refresh();
        state.ui.messageBus.trigger('AlarmsView:ready');
        state.ui.messageBus.unbind('StatisticsView:ready');
      });
      state.ui.messageBus.bind('AlarmsChannelService:channelDisconnected', function() {
        updateStatusInfo(false);
        state.ui.alarms.clear();
      });
      state.ui.messageBus.bind('AlarmsChannelService:channelConnected', function() {
        updateStatusInfo(true);
        state.ui.alarms.clear();
      });
      state.ui.messageBus.bind('FilterManagementView:filter', function(filter) {
        logger.debug("Filter activated");
        logger.debug(filter);
        if (state.ui.alarms) {
          state.ui.alarms.toolbar.get('currentFilter').text = filter.name;
          state.ui.alarms.toolbar.refresh('currentFilter');
          state.ui.alarms.search(filter.criteria);
        } else {
          initialFilter = filter;
        }
      });
    },
    update: function() {
      logger.debug("update");
      render();
    }
  };

})();

