document.addEventListener('DOMContentLoaded', function() {

  w2utils.lock($('#spinner'), "", true);


//  Logger.useDefaults({defaultLevel: Logger.DEBUG});
  Logger.useDefaults();

  var mainLogger = Logger.get('Main');
  var alarmsChannelServiceLogger = Logger.get('AlarmsChannelService');
  var alarmsResourcesServiceLogger = Logger.get('AlarmsResourcesService');
  var alarmsViewLogger = Logger.get('AlarmsView');
  var filterManagementViewLogger = Logger.get('FilterManagementView');
  var statisticsViewLogger = Logger.get('StatisticsView');
  var storeLogger = Logger.get('Store');

  mainLogger.setLevel(Logger.INFO);
  alarmsChannelServiceLogger.setLevel(Logger.INFO);
  alarmsResourcesServiceLogger.setLevel(Logger.INFO);
  alarmsViewLogger.setLevel(Logger.INFO);
  filterManagementViewLogger.setLevel(Logger.INFO);
  statisticsViewLogger.setLevel(Logger.INFO);
  storeLogger.setLevel(Logger.INFO);


  asEvented.call(MessageBus.prototype);
  initialState.ui = {};
  initialState.ui['messageBus'] = new MessageBus();

  var store = new Store(initialState);

  var alarmsViewReady = false;
  var statisticsViewReady = false;
  var filterManagementViewReady = false;

  var uiReadyInterval = null;

  store.getState().ui.messageBus.bind('AlarmsResourcesService:resourcesLoaded', function () {
    mainLogger.debug('AlarmsResourcesService:resourcesLoaded handler');
    w2utils.locale(store.getState().ui.locale.current);
  });

  store.getState().ui.messageBus.bind('AlarmsView:ready', function () {
    mainLogger.debug('AlarmsView:ready handler');
    alarmsViewReady = true;
  });

  store.getState().ui.messageBus.bind('StatisticsView:ready', function () {
    mainLogger.debug('StatisticsView:ready handler');
    statisticsViewReady = true;
  });

  store.getState().ui.messageBus.bind('FilterManagementView:ready', function () {
    mainLogger.debug('FilterManagementView:ready handler');
    filterManagementViewReady = true;
  });

  store.getState().ui.messageBus.bind('AlarmsChannelService:channelConnected', function () {
    mainLogger.debug('AlarmsChannelService:channelConnected handler');
    store.getState().alarms.data = [];
  });

  store.getState().ui.messageBus.bind('AlarmsView:toogleStatistics', function () {
    mainLogger.debug('AlarmsView:toogleStatistics handler');
    w2ui['app'].toggle('top', true);
    setTimeout(function() {
      w2ui['app'].get('top').content.get('main').content.refresh();
    }, 100);
  });

  uiReadyInterval = setInterval(function() {
    if (filterManagementViewReady && alarmsViewReady && statisticsViewReady) {
      clearInterval(uiReadyInterval);
      uiReadyInterval = null;
      store.getState().ui.messageBus.unbind('AlarmsView:ready');
      store.getState().ui.messageBus.unbind('StatisticsView:ready');
      store.getState().ui.messageBus.unbind('FilterManagementView:ready');
      var statisticsPanelSize = "148em";
      if (!store.getState().access.useVerifiedState) {
        statisticsPanelSize = "124em";
      };
      statisticsLayout = $().w2layout({
        name: 'statisticsLayout',
        panels: [
          { type: 'left', size: "50%", resizable: true},
          { type: 'main', resizable: true, content: store.getState().ui.statistics },
        ]
      });
      $('#app').w2layout({
        name: 'app',
        panels: [
          { type: 'top', size: statisticsPanelSize, resizable: true, content: statisticsLayout, hidden: true },
          { type: 'main', resizable: true, content: store.getState().ui.alarms },
          { type: 'right', size: "30%", resizable: true, content: store.getState().ui.filterManagement, hidden: true },
        ]
      });
      mainLogger.info('Layout created');
      w2utils.unlock($('#spinner'));
      store.getState().ui.messageBus.trigger('Main:initialized');
    }
  }, 250);

  FilterManagementView.init(store);
  AlarmsChannelService.init(store);
  AlarmsView.init(store);
  StatisticsView.init(store);
  AlarmsResourcesService.init(store);

}, false);

