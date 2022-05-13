var AlarmsChannelService = (function() {

  var logger = Logger.get('AlarmsChannelService');

  var socket;
  var keepAliveIntervalId = null;
  var reconnectRetry = 0;
  var reconnectIntervalId = null;
  var interval = null;
  var loadingInterval = null;
  var state = null;
  var recordId = 0;


  var onOpen = function(event) {
    logger.debug("onOpen");
    state.ui.messageBus.trigger('AlarmsChannelService:channelConnected');
    if (reconnectIntervalId) {
      clearInterval(reconnectIntervalId);
      reconnectIntervalId = null;
      reconnectRetry = 0;
    }
    state.ui.alarms.lock('Loading...', true);
    state.ui.loading = true;
    keepAliveIntervalId = setInterval(sendKeepAlive, state.access.comm.channel.heartbeatFrecuency);
  };


  var onClose = function(event) {
    logger.debug("onClose");
    state.ui.messageBus.trigger('AlarmsChannelService:channelDisconnected');
    logger.debug("closed. Code: <" + event.code + ">. Reason: <" + event.reason + ">");
    if (state.access.comm.channel.reconnectRetries != -1 && reconnectIntervalId == null) {
      reconnectIntervalId = setInterval( reconnect, state.access.comm.channel.reconnectTimeWait);
    }
    if (state.access.comm.channel.reconnectRetries >= 0) {
      logger.debug("Retrying...");
    }
    if (state.access.comm.channel.reconnectRetries == -1) {
      logger.debug("Connection refused. No retry policy configured");
    }
    if (state.access.comm.channel.reconnectRetries > 0 && reconnectRetry >= state.access.comm.channel.reconnectRetries) {
      clearInterval(reconnectIntervalId);
      reconnectIntervalId = null;
      logger.debug("Max. number of retries (" + state.access.comm.channel.reconnectRetries +") exceeded: " + reconnectRetry);
    }
    if (keepAliveIntervalId) {
      clearInterval(keepAliveIntervalId);
      keepAliveIntervalId = null;
    }
    state.ui.alarms.unlock();
  };


  var onError = function() {
    logger.debug("onError");
  };


  var processAlarm = function(alarm) {
    logger.debug("processAlarm");
    if (alarm.estado == 'VER' && !state.access.useVerifiedState) {
      return;
    }
    var recId = state.alarms.data[alarm.id];
    if (recId != null) {
      var recordIdx = state.ui.alarms.get(recId, true);
      state.ui.alarms.records[recordIdx] = $.extend({}, state.ui.alarms.records[recordIdx], alarm);
    } else {
      var newId = recordId++;
      state.ui.alarms.records.push($.extend({}, alarm, {recid: newId}));
      state.alarms.data[alarm.id] = newId;
    }
    if (state.ui.sounds.enabled && !state.ui.loading && state.ui.sounds[alarm.nivel] != null && alarm.estado == "ACT" && alarm.event_count == "1") {
      var audio = document.getElementById("audioAlarm");
      audio.src = "sounds/" + state.ui.sounds[alarm.nivel].audio;
      audio.volume = state.ui.sounds[alarm.nivel].volume;
      audio.play();
    }
    last = Date.now();
    if (!interval) {
      logger.debug("Interval activated");
      interval = setInterval(function() {
        current = Date.now();
        if (current - last > 125) {
          logger.debug("Start Alarms update");
          setTimeout(function() {
            AlarmsView.update();
            logger.debug("End Alarms update");
          }, 0);
          clearInterval(interval);
          interval = null;
          clearInterval(loadingInterval);
          loadingInterval = null;
          state.ui.loading = false;
          state.ui.alarms.unlock();
          logger.debug("Interval cleared");
        }
      }, 130);
    }
  }


  var onData = function(event) {
    logger.debug("onData");
    var payload = JSON.parse(event.data);
    if (payload.user) {
      logger.debug("Login invitation received");
      state.access.comm.fd = payload.user.fd;
      loginData = {
        login: {
          nombre: state.access.user.id, 
          zona: state.access.user.domain,
          tipo: state.access.panelName, 
          fd: payload.user.fd
        }
      };
      socket.send(JSON.stringify(loginData));
    }
    if (payload.alarma) {
      if (state.ui.loading) {
        setTimeout(function() {
          processAlarm(payload.alarma);
        }, 500);
      } else {
        processAlarm(payload.alarma);
      }
    }
  };


  var sendKeepAlive = function() {
    logger.debug("sendKeepAlive");
    socket.send(JSON.stringify({ keepAlive: true }));
  };


  var send = function() {
    logger.debug("send");
    if (state.access.comm.channel.dataReadyToSend.length > 0) {
      while (state.access.comm.channel.dataReadyToSend.length > 0) {
        var data = state.access.comm.channel.dataReadyToSend.shift();
        socket.send(JSON.stringify(data));
      }
    }
  };


  var connect = function() {
    logger.debug("connect");
    setTimeout(function() {
      state.ui.alarms.lock('Connecting...', true);
      setTimeout(function() {
        logger.debug("connect");
        var endpoint = "ws://" + state.access.comm.channel.hostname + ":" + state.access.comm.channel.port + "/";
        logger.debug("endpoint: " + endpoint);
        socket = new WebSocket(endpoint);
        socket.onopen = onOpen;
        socket.onclose = onClose;
        socket.onerror = onError;
        socket.onmessage = onData;
      }, 1000);
    }, 500);
  }


  var reconnect = function() {
    logger.debug("reconnect");
    if (state.access.comm.channel.reconnectRetries > 0) {
      reconnectRetry++;
    }
    connect();
  };

  return {
    init: function(theStore) {
      logger.debug("init");
      state = theStore.getState();
      state.access.comm.channel['dataReadyToSend'] = [];
      state.ui.messageBus.bind('AlarmsView:ready', function() {
        connect();
        state.ui.messageBus.unbind('AlarmsView:ready');
      });
      state.ui.messageBus.bind('AlarmsView:dataReadyToSend', function() {
        send();
      });
    }
  }

})();
