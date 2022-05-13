var FilterManagementView = (function() {

  var logger = Logger.get('FilterManagementView');
  var state = null;
  var filterTemplate = null;
  var userProfileFilters = null;
  var defaultFilterFile = "";
  var serviceUrl = "";
  var activateClicked = false;
  var defaultClicked = false;
  var noUnselect = false;


  //
  //
  //
  var generateRandomString = function(len) {
    logger.debug("generateRandomString");
    var text = "";
    var charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    for( var i=0; i < len; i++ )
      text += charset.charAt(Math.floor(Math.random() * charset.length));
    return text;
  };

  //
  //
  //
  var loadFilterContent = function(filterFile) {
    logger.debug("loadFilterContent");
    logger.debug("Query filter content to: " + serviceUrl);
    var params = {
      operation: 'get',
      file: filterFile
    };
    logger.debug("Params: " + params);
    $.ajax({
      async: false,
      url: serviceUrl,
      data: params
    })
    .done( function(data) {
      logger.debug("success");
      var defaultFlag = false;
      if (filterFile === defaultFilterFile) {
        defaultFlag = true;
        state.ui.messageBus.trigger('FilterManagementView:filter',
          { name: data.name, criteria: data.criteria });
      }
      userProfileFilters.add(
        { 
          recid: userProfileFilters.records.length + 1,
          filter: data.criteria,
          fileName: filterFile,
          active: defaultFlag,
          default: defaultFlag,
          name: data.name,
          description: data.description
        }
      );
    })
    .fail( function() {
      logger.debug("Error loading filter content");
    })
    .always( function() {
      logger.debug("complete");
    });
  };

  //
  //
  //
  var loadFilterFiles = function() {
    logger.debug("loadFilterFiles");
    logger.debug("Query filters to: " + serviceUrl);
    var params = {
      operation: 'list',
      file: '*filter*json'
    };
    logger.debug("Params: " + params);
    $.ajax({
      async: false,
      url: serviceUrl,
      data: params
    })
    .done( function(data) {
      logger.debug("success");
      if (data.files) {
        for (var i = 0; i < data.files.length; i++) {
          loadFilterContent(data.files[i]);
        }
      }
    })
    .fail( function() {
      logger.debug("Error loading filter files");
    })
    .always( function() {
      userProfileFilters.unlock();
      logger.debug("complete");
    });
  };

  //
  //
  //
  var loadFilters = function() {
    logger.debug("loadFilters");
    logger.debug("Query filters to: " + serviceUrl);
    var params = {
      operation: 'get',
      file: state.access.panelName + '_filter_default'
    };
    logger.debug("Params: " + params);
    userProfileFilters.lock('', true);
    $.ajax({
      async: false,
      url: serviceUrl,
      data: params
    })
    .done( function(data) {
      logger.debug("success");
      if (data.file) {
        defaultFilterFile = data.file;
      }
      loadFilterFiles();
    })
    .fail( function() {
      logger.debug("Error loading default filter");
      loadFilterFiles();
    })
    .always( function() {
      logger.debug("complete");
    });
  };

  //
  //
  //
  var deleteFilter = function(filterRecord) {
    logger.debug("deleteFilter");
    logger.debug("Delete filter to: " + serviceUrl);
    var params = {
      operation: 'delete',
      file: filterRecord.fileName
    };
    logger.debug("Params: " + params);
    userProfileFilters.lock('', true);
    $.ajax({
      url: serviceUrl,
      data: params
    })
    .done( function(data) {
      logger.debug("success");
      if (filterRecord.active) {
        state.ui.messageBus.trigger('FilterManagementView:filter',
          { name: '', criteria: [] });
      }
      userProfileFilters.remove(filterRecord.recid);
      onFilterSelected();
    })
    .fail( function() {
      logger.debug("Error deleting filter");
      userProfileFilters.message('Communications failure');
    })
    .always( function() {
      userProfileFilters.unlock();
      logger.debug("complete");
    });
  };

  //
  //
  //
  var addFilter = function(filterRecord) {
    logger.debug("addFilter");
    logger.debug("Add filter to: " + serviceUrl);
    var jsonString = JSON.stringify(
      {
        "name": filterRecord.name,
        "description": filterRecord.description,
        "criteria": filterRecord.filter 
      }
    );
    var data = {
      operation: 'update',
      file: filterRecord.fileName,
      jsoncontent: jsonString
    };
    logger.debug("Data: " + data);
    userProfileFilters.lock('', true);
    $.ajax({
      url: serviceUrl,
      method: 'POST',
      data: data
    })
    .done( function(data) {
      logger.debug("success");
      if (filterRecord.w2ui && filterRecord.w2ui.changes) {
        delete filterRecord.w2ui;
        userProfileFilters.refreshRow(filterRecord.recid);
      }
      userProfileFilters.refresh();
    })
    .fail( function() {
      logger.debug("Error adding filter");
      userProfileFilters.message('Communications failure');
    })
    .always( function() {
      userProfileFilters.unlock();
      logger.debug("complete");
    });
  };

  //
  //
  //
  var setByDefaultFilter = function(newDefaultFilterRecord, oldDefaultFilterRecord) {
    logger.debug("setByDefaultFilter");
    logger.debug("Set by default filter to: " + serviceUrl);
    var jsonString = JSON.stringify(
      {
        "file": newDefaultFilterRecord.fileName
      }
    );
    var data = {
      operation: 'update',
      file: state.access.panelName + '_filter_default',
      jsoncontent: jsonString
    };
    logger.debug("Data: " + data);
    userProfileFilters.lock('', true);
    $.ajax({
      url: serviceUrl,
      method: 'POST',
      data: data
    })
    .done( function(data) {
      logger.debug("success");
      if (oldDefaultFilterRecord) {
        oldDefaultFilterRecord.default = false;
        userProfileFilters.refreshRow(oldDefaultFilterRecord.recid);
      }
      newDefaultFilterRecord.default = true;
      userProfileFilters.refreshRow(newDefaultFilterRecord.recid);
      onFilterSelected();
    })
    .fail( function() {
      logger.debug("Error setting default filter");
      userProfileFilters.message('Communications failure');
    })
    .always( function() {
      logger.debug("complete");
      userProfileFilters.unlock();
    });
  };

  //
  //
  //
  var unsetByDefaultFilter = function(defaultFilterRecord) {
    logger.debug("unsetByDefaultFilter");
    logger.debug("Unset by default filter to: " + serviceUrl);
    var jsonString = JSON.stringify(
      {
        "file": ""
      }
    );
    var data = {
      operation: 'update',
      file: state.access.panelName + '_filter_default',
      jsoncontent: jsonString
    };
    logger.debug("Data: " + data);
    userProfileFilters.lock('', true);
    $.ajax({
      url: serviceUrl,
      method: 'POST',
      data: data
    })
    .done( function(data) {
      logger.debug("success");
      defaultFilterRecord.default = false;
      userProfileFilters.refreshRow(defaultFilterRecord.recid);
      onFilterSelected();
    })
    .fail( function() {
      logger.debug("Error unsetting default filter");
      userProfileFilters.message('Communications failure');
    })
    .always( function() {
      logger.debug("complete");
      userProfileFilters.unlock();
    });
  };

  //
  //
  //
  var createWidget = function() {

    logger.debug("createWidget");

    filterTemplate = $().w2grid({ 
      name: 'filterTemplate',
      columns: state.alarms.fields,
      searches : state.alarms.filters.searchableFields,
    });

    filterTemplate.on("formSearchOpen", function(event) {
      logger.debug(event);
      var selected = userProfileFilters.getSelection(true);
      if (selected.length == 1) {
        filterTemplate.searchData = userProfileFilters.records[selected[0]].filter;
      } else {
        event.preventDefault();
      }
    });

    filterTemplate.on("formSearch", function(event) {
      logger.debug(event);
      var selected = userProfileFilters.getSelection(true);
      if (selected.length == 1) {
        userProfileFilters.records[selected[0]].filter = event.searchData;
        if (!userProfileFilters.records[selected[0]].w2ui) {
          userProfileFilters.records[selected[0]]['w2ui'] = {changes: []};
        }
        userProfileFilters.records[selected[0]].w2ui['changes'] = 
          $.extend(userProfileFilters.records[selected[0]].w2ui['changes'], {'filter': event.searchData});
        userProfileFilters.refresh();
        setTimeout(function() {
          userProfileFilters.save();
          onActivateFilter(userProfileFilters.records[selected[0]].recid);
        }, 200);
      }
    });

    var renderActive = function(record) {
      logger.debug("renderActive");
      if (record.active)
        return '<div><i class="fa fa-circle" aria-hidden="true"></i></div>';
      else 
        return '<div><i class="fa fa-circle-o" aria-hidden="true"></i></div>';
    };

    var renderDefault = function(record) {
      logger.debug("renderDefault");
      if (record.default) 
        return '<div><i class="fa fa-circle" aria-hidden="true"></i></div>';
      else
        return '<div><i class="fa fa-circle-o" aria-hidden="true"></i></div>';
    };

    userProfileFilters = $().w2grid({
      name: 'userProfileFilters',
      multiSelect: false,
      onAdd: function(event) {
        logger.debug("onAdd");
        event.preventDefault();
        onAddFilter();
      },
      onDelete: function(event) {
        logger.debug("onDelete");
        event.preventDefault();
        onDeleteFilter();
      },
      onSave: function(event) {
        logger.debug("onSave");
        event.preventDefault();
        onSaveFilters(event.changes);
      },
      onChange: function(event) {
        logger.debug("onChange");
        setTimeout(function() {
          userProfileFilters.save();
        }, 200);
      },
      onSelect: function(event) {
        logger.debug("onSelect");
        event.onComplete = function() {
           onFilterSelected();
        };
      },
      onUnselect: function(event) {
        logger.debug("onUnselect");
        if ((activateClicked || defaultClicked) && noUnselect) {
          event.preventDefault();
        } else {
          onFilterUnselected();
        }
      },
      onClick: function(event) {
        logger.debug("onClick");
        activateClicked = false;
        defaultClicked = false;
        noUnselect = false;
        var currentRecIdSelected = null;
        if (userProfileFilters.getSelection().length > 0) {
          currentRecIdSelected = userProfileFilters.get(userProfileFilters.getSelection()[0]).recid;
        }
        if (event.column == 2) {
          activateClicked = true;
          if (currentRecIdSelected && currentRecIdSelected == event.recid) {
            noUnselect = true;
          }
          onActivateFilterClicked(event.recid);
        }
        if (event.column == 3) {
          defaultClicked = true;
          if (currentRecIdSelected && currentRecIdSelected == event.recid) {
            noUnselect = true;
          }
          onDefaultFilterClicked(event.recid);
        }
      },
      show: {
        toolbar: true,
        toolbarAdd: true,
        toolbarDelete: true,
        toolbarSave: false,
        toolbarSearch: false,
        toolbarInput: false,
        toolbarReload: false,
        toolbarColumns: false
      },
      columns: [
        { field: 'filter', hidden: true },
        { field: 'fileName', hidden: true },
        { field: 'active', caption: 'Active', size: '7%', style: 'text-align: center', render: function(record) { return renderActive(record); } },
        { field: 'default', caption: 'Default', size: '7%', style: 'text-align: center', render: function(record) { return renderDefault(record); } },
        { field: 'name', size: '33%', caption: 'Name', sortable: true, editable: { type: 'text' } },
        { field: 'description', size: '53%', caption: 'Description', editable: { type: 'text' } }
      ],
      sortData: [
        {field: 'name', direction: 'asc'}
      ]
    });

    var tb = userProfileFilters.toolbar;
    tb.get('w2ui-add').text = '';
    tb.get('w2ui-delete').text = '';

    state.ui.filterManagement = $().w2layout({
      name: 'userProfileFiltersLayout',
      panels: [
        { type: 'top', size:  "0%", resizable: false, content: filterTemplate, hidden: true },
        { type: 'main', size: "50%", resizable: true, content: userProfileFilters },
        { type: 'bottom', size: "50%", resizable: true, content: "" },
      ]
    });
  };

  //
  //
  //
  var onFilterSelected = function(event) {
    logger.debug("onFilterSelected");
    var selectedIndexSet = userProfileFilters.getSelection();
    if (selectedIndexSet.length > 0) {
      var selectedRecord = userProfileFilters.get(selectedIndexSet[0]);
      filterTemplate.formSearchOpen();
      $('#layout_userProfileFiltersLayout_panel_bottom .w2ui-panel-content').addClass("w2ui-reset w2ui-grid-searches");
    }
  };

  //
  //
  //
  var onFilterUnselected = function(event) {
    logger.debug("onFilterUnselected");
    filterTemplate.formSearchClose();
  };

  //
  //
  //
  var onAddFilter = function(event) {
    logger.debug("onAddFilter");
    var newRecId = userProfileFilters.records.length + 1;
    userProfileFilters.add(
      {
        recid: newRecId,
        filter: [],
        fileName: state.access.panelName + "_filter_" + generateRandomString(8) + ".json",
        active: false,
        default: false,
        name: 'new_filter_name_' + newRecId,
        description: 'new_filter_description_' + newRecId
      }
    );
    addFilter(userProfileFilters.get(newRecId));
  };

  //
  //
  //
  var onDeleteFilter = function() {
    logger.debug("onDeleteFilter");
    var selectedIndexSet = userProfileFilters.getSelection();
    if (selectedIndexSet.length > 0) {
      filterTemplate.formSearchClose();
      var selectedRecord = userProfileFilters.get(selectedIndexSet[0]);
      deleteFilter(selectedRecord);
    }
  };

  //
  //
  //
  var onSaveFilters = function(changes) {
    logger.debug("onSaveFilters");
    for (var i = 0; i < changes.length; i++) {
      var record = userProfileFilters.get(changes[i].recid);
      $.extend(record, changes[i]);
      addFilter(userProfileFilters.get(changes[i].recid));
    }
  };

  //
  //
  //
  var onActivateFilterClicked = function(recid) {
    logger.debug("onActivateFilterClicked");
    var currentRecordClicked = userProfileFilters.get(recid);
    if (currentRecordClicked.active == false) {
      onActivateFilter(recid);
    } else {
      onDeactivateFilter(recid);
    }
  }

  //
  //
  //
  var onActivateFilter = function(recid) {
    logger.debug("onActivateFilter");
    var currentActiveIndexSet = userProfileFilters.find({ active: true });
    var newActiveIndex = recid;
    var newActiveRecord = userProfileFilters.get(newActiveIndex);
    if (currentActiveIndexSet.length > 0) {
      if (currentActiveIndexSet[0] != newActiveIndex) {
        var currentActiveRecord = userProfileFilters.get(currentActiveIndexSet[0]);
        currentActiveRecord.active = false;
        newActiveRecord.active = true;
        userProfileFilters.refreshRow(currentActiveRecord.recid);
        userProfileFilters.refreshRow(newActiveRecord.recid);
      }
    } else {
      var newActiveIndex = recid;
      newActiveRecord.active = true;
      userProfileFilters.refreshRow(newActiveRecord.recid);
    }
    state.ui.messageBus.trigger('FilterManagementView:filter',
      { name: newActiveRecord.name, criteria: newActiveRecord.filter });
    onFilterSelected();
  };

  //
  //
  //
  var onDeactivateFilter = function(recid) {
    logger.debug("onDeactivateFilter");
    var selectedIndex = recid;
    var selectedRecord = userProfileFilters.get(selectedIndex);
    if (selectedRecord.active) {
      selectedRecord.active = false;
      userProfileFilters.refreshRow(recid);
      state.ui.messageBus.trigger('FilterManagementView:filter',
        { name: '', criteria: [] });
    }
    onFilterSelected();
  };

  //
  //
  //
  var onDefaultFilterClicked = function(recid) {
    logger.debug("onDefaultFilterClicked");
    var currentRecordClicked = userProfileFilters.get(recid);
    if (currentRecordClicked.default == false) {
      onSetByDefaultFilter(recid);
    } else {
      onUnsetByDefaultFilter(recid);
    }
  }

  //
  //
  //
  var onSetByDefaultFilter = function(recid) {
    logger.debug("onSetByDefaultFilter");
    var currentDefaultIndexSet = userProfileFilters.find({ default: true });
    var newDefaultIndex = recid;
    if (currentDefaultIndexSet.length > 0) {
      if (currentDefaultIndexSet[0] != newDefaultIndex) {
        var newDefaultRecord = userProfileFilters.get(newDefaultIndex);
        var currentDefaultRecord = userProfileFilters.get(currentDefaultIndexSet[0]);
        setByDefaultFilter(newDefaultRecord, currentDefaultRecord);
      }
    } else {
      var newDefaultRecord = userProfileFilters.get(newDefaultIndex);
      setByDefaultFilter(newDefaultRecord, null);
    }
  };

  //
  //
  //
  var onUnsetByDefaultFilter = function(recid) {
    logger.debug("onUnsetByDefaultFilter");
    var selectedRecord = userProfileFilters.get(recid);
    if (selectedRecord.default) {
      unsetByDefaultFilter(selectedRecord);
    }
  };

  //
  //
  //
  return {
    init: function(store) {
      logger.debug("init");
      state = store.getState();
      serviceUrl = "http://" +
        state.access.comm.resources.hostname + ":" +
        state.access.comm.resources.port + "/" +
        state.access.comm.resources.servicePath;
      state.ui.messageBus.bind('AlarmsResourcesService:resourcesLoaded', function() {
        createWidget();
        loadFilters();
        onFilterUnselected();
        state.ui.messageBus.trigger('FilterManagementView:ready');
      });
    }
  };

})();

