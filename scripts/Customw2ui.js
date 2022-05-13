w2obj.grid.prototype.operators = {
  "text"    : ['is', 'begins', 'contains', 'not contains', 'ends'],
  "number"  : ['is', 'between', { oper: 'less', text: 'less than'}, { oper: 'more', text: 'more than' }],
  "date"    : ['is', 'between', { oper: 'less', text: 'before'}, { oper: 'more', text: 'after' }],
  "list"    : ['is'],
  "hex"     : ['is', 'between'],
  "color"   : ['is', 'begins', 'contains', 'ends'],
  "enum"    : ['in', 'not in']
};

w2obj.grid.prototype.formGetSearchesHTML = function () {
  var obj  = this;
  var html = '<table cellspacing="0"><tbody>';
    html += '<tr>'+
      '    <td colspan="4" class="actions">'+
      '        <div>'+
      '        <button class="w2ui-btn" onclick="obj = w2ui[\''+ this.name +'\']; if (obj) { obj.formSearchReset(); }">'+ w2utils.lang('Reset') + '</button>'+
      '        <button class="w2ui-btn w2ui-btn-blue" onclick="obj = w2ui[\''+ this.name +'\']; if (obj) { obj.formSearch(); }">'+ w2utils.lang('Save') + '</button>'+
      '        </div>'+
      '    </td>'+
      '</tr>';
//  var showBtn = false;
  for (var i = 0; i < this.searches.length; i++) {
    var s = this.searches[i];
    s.type = String(s.type).toLowerCase();
    if (s.hidden) continue;
//    var btn = '';
//    if (showBtn == false) {
//      btn = '<button class="w2ui-btn close-btn" onclick="obj = w2ui[\''+ this.name +'\']; if (obj) obj.searchClose()">X</button>';
//      showBtn = true;
//    }
    if (s.inTag == null) s.inTag = '';
    if (s.outTag == null) s.outTag = '';
    if (s.style == null) s.style = '';
    if (s.type == null) s.type = 'text';

    var operator =
      '<select id="grid_'+ this.name + '_searchOperator_'+ i + '" class="w2ui-input" ' +
      '   onchange="w2ui[\''+ this.name + '\'].formInitOperator(this, '+ i +')">' + getOperators(s.type, s.operators) +
      '</select>';


    html += '<tr>'+
//      '    <td class="close-btn">'+ btn +'</td>' +
      '    <td class="caption">'+ (s.caption || '') +'</td>' +
      '    <td class="operator">'+ operator +'</td>'+
      '    <td class="value">';

    switch (s.type) {
      case 'text':
      case 'alphanumeric':
      case 'hex':
      case 'color':
      case 'list':
      case 'combo':
      case 'enum':
        var tmpStyle = 'width: 250px;';
        if (['hex', 'color'].indexOf(s.type) != -1) tmpStyle = 'width: 90px;';
        html += '<input rel="search" type="text" id="grid_'+ this.name + '_searchField_' + i + '" name="' + s.field + '" ' +
          '   class="w2ui-input" style="' + tmpStyle + s.style + '" ' + s.inTag +'/>';
        break;
      case 'int':
      case 'float':
      case 'money':
      case 'currency':
      case 'percent':
      case 'date':
      case 'time':
      case 'datetime':
        var tmpStyle = 'width: 90px';
        if (s.type == 'datetime') tmpStyle = 'width: 140px;';
        html += '<input rel="search" type="text" class="w2ui-input" style="' + tmpStyle + s.style + '" id="grid_' + this.name +'_searchField_'+ i +'" name="'+ s.field +'" '+ s.inTag +'/>'+
          '<span id="grid_'+ this.name +'_searchRange_'+ i +'" style="display: none">&#160;-&#160;&#160;'+
          '<input rel="search" type="text" class="w2ui-input" style="'+ tmpStyle + s.style +'" id="grid_'+ this.name +'_searchField2_'+ i +'" name="'+ s.field +'" '+ s.inTag +'/>'+
          '</span>';
        break;
      case 'select':
        html += '<select rel="search" class="w2ui-input" style="'+ s.style +'" id="grid_'+ this.name +'_searchField_'+ i +'" '+
          ' name="'+ s.field +'" '+ s.inTag +'></select>';
        break;
    }
    html += s.outTag +
      '    </td>' +
      '</tr>';
  }
  html += '</tbody></table>';
  return html;

  function getOperators(type, fieldOperators) {
    var html = '';
    var operators = obj.operators[obj.operatorsMap[type]];
    if (fieldOperators != null) operators = fieldOperators;
    for (var i = 0; i < operators.length; i++) {
      var oper = operators[i];
      var text = oper;
      if (Array.isArray(oper)) {
        text = oper[1];
        oper = oper[0];
        if (text == null) text = oper;
      } else if ($.isPlainObject(oper)) {
        text = oper.text;
        oper = oper.oper;
      }
      html += '<option value="'+ oper +'">'+ w2utils.lang(text) +'</option>\n';
    }
    return html;
  }
};

w2obj.grid.prototype.formInitOperator = function (el, search_ind) {
  var obj = this;
  var search = obj.searches[search_ind];
  var range = $('#grid_'+ obj.name + '_searchRange_'+ search_ind);
  var fld1 = $('#grid_'+ obj.name +'_searchField_'+ search_ind);
  var fld2 = fld1.parent().find('span input');
  fld1.show();
  range.hide();
  // fld1.w2field(search.type);
  switch ($(el).val()) {
//                case 'in':
//                case 'not in':
//                    fld1.w2field('clear');
//                    break;
    case 'between':
      range.show();
      fld2.w2field(search.type, search.options);
      break;
    case 'not null':
    case 'null':
      fld1.hide();
      fld1.val('1'); // need to insert something for search to activate
      fld1.change();
      break;
    }
};

w2obj.grid.prototype.formInitSearches = function () {
  var obj = this;
  // init searches
  for (var s = 0; s < this.searches.length; s++) {
    var search = this.searches[s];
    var sdata = this.getSearchData(search.field);
    search.type = String(search.type).toLowerCase();
    var operators = obj.operators[obj.operatorsMap[search.type]];
    if (search.operators) operators = search.operators;
    var operator = operators[0]; // default operator
    if ($.isPlainObject(operator)) operator = operator.oper;
    if (typeof search.options != 'object') search.options = {};
    if (search.type == 'text') operator = 'contains'; // default operator for text
    // only accept search.operator if it is valid
    for (var i = 0; i < operators.length; i++) {
      var oper = operators[i];
      if ($.isPlainObject(oper)) oper = oper.oper;
      if (search.operator == oper) {
        operator = search.operator;
        break;
      }
    }
    // init types
    switch (search.type) {
      case 'text':
      case 'alphanumeric':
        $('#grid_'+ this.name +'_searchField_' + s).w2field(search.type, search.options);
        break;
      case 'int':
      case 'float':
      case 'hex':
      case 'color':
      case 'money':
      case 'currency':
      case 'percent':
      case 'date':
      case 'time':
      case 'datetime':
        $('#grid_'+ this.name +'_searchField_'+s).w2field(search.type, search.options);
        $('#grid_'+ this.name +'_searchField2_'+s).w2field(search.type, search.options);
        setTimeout(function () { // convert to date if it is number
          $('#grid_'+ obj.name +'_searchField_'+s).keydown();
          $('#grid_'+ obj.name +'_searchField2_'+s).keydown();
        }, 1);
        break;
      case 'list':
      case 'combo':
      case 'enum':
        var options = search.options;
        if (search.type == 'list') options.selected = {};
        if (search.type == 'enum') options.selected = [];
        if (sdata) options.selected = sdata.value;
        $('#grid_'+ this.name +'_searchField_'+s).w2field(search.type, $.extend({ openOnFocus: true }, options));
        if (sdata && sdata.text != null) $('#grid_'+ this.name +'_searchField_'+s).data('selected', {id: sdata.value, text: sdata.text});
        break;
      case 'select':
        // build options
        var options = '<option value="">--</option>';
        for (var i = 0; i < search.options.items.length; i++) {
          var si = search.options.items[i];
          if ($.isPlainObject(search.options.items[i])) {
            var val = si.id;
            var txt = si.text;
            if (val == null && si.value != null)   val = si.value;
            if (txt == null && si.caption != null) txt = si.caption;
            if (val == null) val = '';
            options += '<option value="'+ val +'">'+ txt +'</option>';
          } else {
            options += '<option value="'+ si +'">'+ si +'</option>';
          }
        }
        $('#grid_'+ this.name +'_searchField_'+s).html(options);
        break;
    }
    if (sdata != null) {
      if (sdata.type == 'int' && ['in', 'not in'].indexOf(sdata.operator) != -1) {
        $('#grid_'+ this.name +'_searhcField_'+ s).w2field('clear').val(sdata.value);
      }
      $('#grid_'+ this.name +'_searchOperator_'+ s).val(sdata.operator).trigger('change');
      if (!$.isArray(sdata.value)) {
        if (sdata.value != null) $('#grid_'+ this.name +'_searchField_'+ s).val(sdata.value).trigger('change');
      } else {
        if (['in', 'not in'].indexOf(sdata.operator) != -1) {
          $('#grid_'+ this.name +'_searchField_'+ s).val(sdata.value).trigger('change');
        } else {
          $('#grid_'+ this.name +'_searchField_'+ s).val(sdata.value[0]).trigger('change');
          $('#grid_'+ this.name +'_searchField2_'+ s).val(sdata.value[1]).trigger('change');
        }
      }
    } else {
      $('#grid_'+ this.name +'_searchOperator_'+s).val(operator).trigger('change');
    }
  }
  // add on change event
  $('#w2ui-overlay-'+ this.name +'-searchOverlay .w2ui-grid-searches *[rel=search]').on('keypress', function (evnt) {
    if (evnt.keyCode == 13) {
      obj.search();
      $().w2overlay({ name: obj.name + '-searchOverlay' });
    }
  });
};

w2obj.grid.prototype.formSearch = function () {
  var obj = this;
  var url = (typeof this.url != 'object' ? this.url : this.url.get);
  var searchData = [];
  var last_multi = this.last.multi;
  var last_logic = this.last.logic;
  var last_field = this.last.field;
  var last_search = this.last.search;
  var hasHiddenSearches = false;
  // add hidden searches
  for (var i = 0; i < this.searches.length; i++) {
    if (!this.searches[i].hidden) continue;
    searchData.push({
      field: this.searches[i].field,
      operator: this.searches[i].operator || 'is',
      type: this.searches[i].type,
      value: this.searches[i].value || ''
    });
    hasHiddenSearches = true;
  }
  last_search = '';
  // advanced search
  for (var i = 0; i < this.searches.length; i++) {
    var search = this.searches[i];
    var operator = $('#grid_'+ this.name + '_searchOperator_'+ i).val();
    var field1 = $('#grid_'+ this.name + '_searchField_'+ i);
    var field2 = $('#grid_'+ this.name + '_searchField2_'+ i);
    var value1 = field1.val();
    var value2 = field2.val();
    var svalue = null;
    var text = null;
    if (['int', 'float', 'money', 'currency', 'percent'].indexOf(search.type) != -1) {
      var fld1 = field1.data('w2field');
      var fld2 = field2.data('w2field');
      if (fld1) value1 = fld1.clean(value1);
      if (fld2) value2 = fld2.clean(value2);
    }
    if (['list', 'enum'].indexOf(search.type) != -1) {
      value1 = field1.data('selected') || {};
      if ($.isArray(value1)) {
        svalue = [];
        for (var j = 0; j < value1.length; j++) {
          svalue.push(w2utils.isFloat(value1[j].id) ? parseFloat(value1[j].id) : String(value1[j].id).toLowerCase());
          delete value1[j].hidden;
        }
        if ($.isEmptyObject(value1)) value1 = '';
      } else {
        text = value1.text || '';
        value1 = value1.id || '';
      }
    }
    if ((value1 !== '' && value1 != null) || (value2 != null && value2 !== '')) {
      var tmp = {
        field: search.field,
        type: search.type,
        operator: operator
      };
      if (operator == 'between') {
        $.extend(tmp, { value: [value1, value2] });
      } else if (operator == 'in' && typeof value1 == 'string') {
        $.extend(tmp, { value: value1.split(',') });
      } else if (operator == 'not in' && typeof value1 == 'string') {
        $.extend(tmp, { value: value1.split(',') });
      } else {
        $.extend(tmp, { value: value1 });
      }
      if (svalue) $.extend(tmp, { svalue: svalue });
      if (text) $.extend(tmp, { text: text });
       // conver date to unix time
      try {
        if (search.type == 'date' && operator == 'between') {
          tmp.value[0] = value1; // w2utils.isDate(value1, w2utils.settings.dateFormat, true).getTime();
          tmp.value[1] = value2; // w2utils.isDate(value2, w2utils.settings.dateFormat, true).getTime();
        }
        if (search.type == 'date' && operator == 'is') {
          tmp.value = value1; // w2utils.isDate(value1, w2utils.settings.dateFormat, true).getTime();
        }
      } catch (e) {
      }
      searchData.push(tmp);
    }
  }
  last_multi = true;
  last_logic = 'AND';
  // event before
  var edata = this.trigger({ 
    phase: 'before', 
    type: 'formSearch', 
    multi: (arguments.length === 0 ? true : false), 
    target: this.name, 
    searchData: searchData,
    searchField: 'multi', 
    searchValue: 'multi' 
  });
  if (edata.isCancelled === true) return;
  // default action
  this.searchData = edata.searchData;
  this.last.field = last_field;
  this.last.search = last_search;
  this.last.multi = last_multi;
  this.last.logic = last_logic;
  this.last.scrollTop = 0;
  this.last.scrollLeft = 0;
  this.last.selection.indexes = [];
  this.last.selection.columns = {};
  // -- clear all search field
  //this.formSearchClose();
  // apply search
  if (url) {
    this.last.xhr_offset = 0;
    this.reload();
  } else {
    // local search
    this.localSearch();
    this.refresh();
  }
  // event after
  this.trigger($.extend(edata, { phase: 'after' }));
};

w2obj.grid.prototype.formSearchOpen = function () {
  if (!this.box) return;
  if (this.searches.length === 0) return;
  var obj = this;
//  var it  = obj.toolbar.get('w2ui-search-advanced');
//  var btn = '#tb_'+ obj.toolbar.name +'_item_'+ w2utils.escapeId(it.id) +' table.w2ui-button';
  // event before
  var edata = this.trigger({ phase: 'before', type: 'formSearchOpen', target: this.name });
  if (edata.isCancelled === true) {
//    setTimeout(function () { obj.toolbar.uncheck('w2ui-search-advanced'); }, 1);
    return;
  }

  w2ui['userProfileFiltersLayout'].content('bottom', obj.formGetSearchesHTML());
  obj.formInitSearches();
  obj.trigger($.extend(edata, { phase: 'after' }));
/*
  // show search
  $('#tb_'+ this.name +'_toolbar_item_w2ui-search-advanced').w2overlay({
    html    : this.formGetSearchesHTML(),
    name    : this.name + '-searchOverlay',
    left    : -10,
    'class' : 'w2ui-grid-searches',
    onShow  : function () {
      obj.formInitSearches();
      $('#w2ui-overlay-'+ obj.name +'-searchOverlay .w2ui-grid-searches').data('grid-name', obj.name);
      var sfields = $('#w2ui-overlay-'+ this.name +'-searchOverlay .w2ui-grid-searches *[rel=search]');
      if (sfields.length > 0) sfields[0].focus();
//      if (!it.checked) {
//        it.checked = true;
//        $(btn).addClass('checked');
//      }
      // event after
      obj.trigger($.extend(edata, { phase: 'after' }));
    },
    onHide: function () {
//      it.checked = false;
//      $(btn).removeClass('checked');
    }
  });
*/
};

w2obj.grid.prototype.formSearchClose = function () {
  var obj = this;
  if (!this.box) return;
  if (this.searches.length === 0) return;
  w2ui['userProfileFiltersLayout'].content('bottom', "");
//  if (this.toolbar) this.toolbar.uncheck('w2ui-search-advanced');
  // hide search
//  $().w2overlay({ name: this.name + '-searchOverlay' });
};

w2obj.grid.prototype.formSearchReset = function (noRefresh) {
  var searchData = [];
  var hasHiddenSearches = false;
  // add hidden searches
  for (var i = 0; i < this.searches.length; i++) {
    if (!this.searches[i].hidden) continue;
      searchData.push({
        field: this.searches[i].field,
        operator: this.searches[i].operator || 'is',
        type: this.searches[i].type,
        value: this.searches[i].value || ''
      });
      hasHiddenSearches = true;
  }
  // event before
  var edata = this.trigger({ phase: 'before', type: 'formSearch', reset: true, target: this.name, searchData: searchData });
  if (edata.isCancelled === true) return;
  // default action
  this.searchData = edata.searchData;
  this.last.search = '';
  this.last.logic = (hasHiddenSearches ? 'AND' : 'OR');
  // --- do not reset to All Fields (I think)
  if (this.searches.length > 0) {
    if (!this.multiSearch || !this.show.searchAll) {
      var tmp = 0;
      while (tmp < this.searches.length && (this.searches[tmp].hidden || this.searches[tmp].simple === false)) tmp++;
        if (tmp >= this.searches.length) {
          // all searches are hidden
          this.last.field = '';
          this.last.caption = '';
        } else {
          this.last.field = this.searches[tmp].field;
          this.last.caption = this.searches[tmp].caption;
        }
    } else {
      this.last.field   = 'all';
      this.last.caption = w2utils.lang('All Fields');
    }
  }
  this.last.multi      = false;
  this.last.xhr_offset = 0;
  // reset scrolling position
  this.last.scrollTop  = 0;
  this.last.scrollLeft = 0;
  this.last.selection.indexes = [];
  this.last.selection.columns = {};
  // -- clear all search field
  this.formSearchClose();
  $('#grid_'+ this.name +'_search_all').val('').removeData('selected');
  // apply search
  if (!noRefresh) this.reload();
  // event after
  this.trigger($.extend(edata, { phase: 'after' }));
};


w2obj.grid.prototype._localSearch = w2obj.grid.prototype.localSearch;


            // check if a record (or one of its closed children) matches the search data
w2obj.grid.prototype.localSearch = function (silent) {
            var url = (typeof this.url != 'object' ? this.url : this.url.get);
            if (url) {
                console.log('ERROR: grid.localSearch can only be used on local data source, grid.url should be empty.');
                return;
            }
            var time = (new Date()).getTime();
            var obj = this;
            var defaultToString = {}.toString;
            var duplicateMap = {};
            this.total = this.records.length;
            // mark all records as shown
            this.last.searchIds = [];
            // prepare date/time fields
            this.prepareData();
            // hide records that did not match
            if (this.searchData.length > 0 && !url) {
                this.total = 0;
                for (var i = 0; i < this.records.length; i++) {
                    var rec = this.records[i];
                    var match = searchRecord(rec);
                    if (match) {
                        if (rec && rec.w2ui)
                            addParent(rec.w2ui.parent_recid);
                        this.last.searchIds.push(i);
                    }
                }
                this.total = this.last.searchIds.length;
            }
            time = (new Date()).getTime() - time;
            if (silent !== true && obj.show.statusSearch) {
                setTimeout(function () {
                    obj.status(w2utils.lang('Search took') + ' ' + time/1000 + ' ' + w2utils.lang('sec'));
                }, 10);
            }
            return time;

            // check if a record (or one of its closed children) matches the search data
            function searchRecord(rec) {
                var fl  = 0;
                for (var j = 0; j < obj.searchData.length; j++) {
                    var sdata  = obj.searchData[j];
                    var search = obj.getSearch(sdata.field);
                    if (sdata  == null) continue;
                    if (search == null) search = { field: sdata.field, type: sdata.type };
                    var val1b = obj.parseField(rec, search.field);
                    var val1 = (val1b !== null && val1b !== undefined &&
                        (typeof val1b != "object" || val1b.toString != defaultToString)) ?
                        String(val1b).toLowerCase() : "";  // do not match a bogus string
                    if (sdata.value != null) {
                        if (!$.isArray(sdata.value)) {
                            var val2 = String(sdata.value).toLowerCase();
                        } else {
                            var val2 = sdata.value[0];
                            var val3 = sdata.value[1];
                        }
                    }
                    switch (sdata.operator) {
                    case 'is':
                        if (obj.parseField(rec, search.field) == sdata.value) fl++; // do not hide record
                        else if (search.type == 'date') {
                            var tmp  = (obj.parseField(rec, search.field + '_') instanceof Date ? obj.parseField(rec, search.field + '_') : obj.parseField(rec, search.field));
                            var val1 = w2utils.formatDate(tmp, 'yyyy-mm-dd');
                            var val2 = w2utils.formatDate(w2utils.isDate(val2, w2utils.settings.dateFormat, true), 'yyyy-mm-dd');
                            if (val1 == val2) fl++;
                        }
                        else if (search.type == 'time') {
                            var tmp  = (obj.parseField(rec, search.field + '_') instanceof Date ? obj.parseField(rec, search.field + '_') : obj.parseField(rec, search.field));
                            var val1 = w2utils.formatTime(tmp, 'hh24:mi');
                            var val2 = w2utils.formatTime(val2, 'hh24:mi');
                            if (val1 == val2) fl++;
                        }
                        else if (search.type == 'datetime') {
//                            var tmp  = (obj.parseField(rec, search.field + '_') instanceof Date ? obj.parseField(rec, search.field + '_') : obj.parseField(rec, search.field));
//                            var val1 = w2utils.formatDateTime(tmp, 'yyyy-mm-dd|hh24:mm:ss');
                            var val1 = w2utils.isDateTime( obj.parseField(rec, search.field), obj.getColumn(search.field).render.replace('datetime:', ''),true);
//                            var val2 = w2utils.formatDateTime(w2utils.isDateTime(val2, w2utils.settings.datetimeFormat, true), 'yyyy-mm-dd|hh24:mm:ss');
                            var val2 = w2utils.isDateTime(val2, w2utils.settings.datetimeFormat, true);
                            if (val1.getTime() == val2.getTime()) fl++;
                        }
                        break;
                    case 'between':
                        if (['int', 'float', 'money', 'currency', 'percent'].indexOf(search.type) != -1) {
                            if (parseFloat(obj.parseField(rec, search.field)) >= parseFloat(val2) && parseFloat(obj.parseField(rec, search.field)) <= parseFloat(val3)) fl++;
                        }
                        else if (search.type == 'date') {
                            var tmp = (obj.parseField(rec, search.field + '_') instanceof Date ? obj.parseField(rec, search.field + '_') : obj.parseField(rec, search.field));
                            var val1 = w2utils.isDate(tmp, w2utils.settings.dateFormat, true);
                            var val2 = w2utils.isDate(val2, w2utils.settings.dateFormat, true);
                            var val3 = w2utils.isDate(val3, w2utils.settings.dateFormat, true);
                            if (val3 != null) val3 = new Date(val3.getTime() + 86400000); // 1 day
                            if (val1 >= val2 && val1 < val3) fl++;
                        }
                        else if (search.type == 'time') {
                            var val1 = (obj.parseField(rec, search.field + '_') instanceof Date ? obj.parseField(rec, search.field + '_') : obj.parseField(rec, search.field));
                            var val2 = w2utils.isTime(val2, true);
                            var val3 = w2utils.isTime(val3, true);
                            val2 = (new Date()).setHours(val2.hours, val2.minutes, val2.seconds ? val2.seconds : 0, 0);
                            val3 = (new Date()).setHours(val3.hours, val3.minutes, val3.seconds ? val3.seconds : 0, 0);
                            if (val1 >= val2 && val1 < val3) fl++;
                        }
                        else if (search.type == 'datetime') {
//                            var val1 = (obj.parseField(rec, search.field + '_') instanceof Date ? obj.parseField(rec, search.field + '_') : obj.parseField(rec, search.field));
                            var val1 = w2utils.isDateTime(obj.parseField(rec, search.field), obj.getColumn(search.field).render.replace('datetime:', ''),true);
                            var val2 = w2utils.isDateTime(val2, w2utils.settings.datetimeFormat, true);
                            var val3 = w2utils.isDateTime(val3, w2utils.settings.datetimeFormat, true);
//                            if (val3) val3 = new Date(val3.getTime() + 86400000); // 1 day
                            if (val1.getTime() >= val2.getTime() && val1.getTime() < val3.getTime()) fl++;
                        }
                        break;
                    case 'less':
                        if (['int', 'float', 'money', 'currency', 'percent'].indexOf(search.type) != -1) {
                            if (parseFloat(obj.parseField(rec, search.field)) <= parseFloat(sdata.value)) fl++;
                        }
                        else if (search.type == 'date') {
                            var tmp  = (obj.parseField(rec, search.field + '_') instanceof Date ? obj.parseField(rec, search.field + '_') : obj.parseField(rec, search.field));
                            var val1 = w2utils.formatDate(w2utils.isDate(tmp, w2utils.settings.dateFormat, true), 'yyyy-mm-dd');
                            var val2 = w2utils.formatDate(w2utils.isDate(val2, w2utils.settings.dateFormat, true), 'yyyy-mm-dd');
                            if (val1 <= val2) fl++;
                        }
                        else if (search.type == 'time') {
                            var tmp  = (obj.parseField(rec, search.field + '_') instanceof Date ? obj.parseField(rec, search.field + '_') : obj.parseField(rec, search.field));
                            var val1 = w2utils.formatTime(tmp, 'hh24:mi');
                            var val2 = w2utils.formatTime(val2, 'hh24:mi');
                            if (val1 <= val2) fl++;
                        }
                        else if (search.type == 'datetime') {
//                            var tmp  = (obj.parseField(rec, search.field + '_') instanceof Date ? obj.parseField(rec, search.field + '_') : obj.parseField(rec, search.field));
//                            var val1 = w2utils.formatDateTime(tmp, 'yyyy-mm-dd|hh24:mm:ss');
                            var val1 = w2utils.isDateTime(obj.parseField(rec, search.field), obj.getColumn(search.field).render.replace('datetime:', ''),true);
//                            var val2 = w2utils.formatDateTime(w2utils.isDateTime(val2, w2utils.settings.datetimeFormat, true), 'yyyy-mm-dd|hh24:mm:ss');
                            var val2 = w2utils.isDateTime(val2, w2utils.settings.datetimeFormat, true);
//                            if ( (val1.length == val2.length) && (val1 <= val2) ) fl++;
                            if ( val1.getTime() <= val2.getTime() ) fl++;
                        }
                        break;
                    case 'more':
                        if (['int', 'float', 'money', 'currency', 'percent'].indexOf(search.type) != -1) {
                            if (parseFloat(obj.parseField(rec, search.field)) >= parseFloat(sdata.value)) fl++;
                        }
                        else if (search.type == 'date') {
                            var tmp  = (obj.parseField(rec, search.field + '_') instanceof Date ? obj.parseField(rec, search.field + '_') : obj.parseField(rec, search.field));
                            var val1 = w2utils.formatDate(w2utils.isDate(tmp, w2utils.settings.dateFormat, true), 'yyyy-mm-dd');
                            var val2 = w2utils.formatDate(w2utils.isDate(val2, w2utils.settings.dateFormat, true), 'yyyy-mm-dd');
                            if (val1 >= val2) fl++;
                        }
                        else if (search.type == 'time') {
                            var tmp  = (obj.parseField(rec, search.field + '_') instanceof Date ? obj.parseField(rec, search.field + '_') : obj.parseField(rec, search.field));
                            var val1 = w2utils.formatTime(tmp, 'hh24:mi');
                            var val2 = w2utils.formatTime(val2, 'hh24:mi');
                            if (val1 >= val2) fl++;
                        }
                        else if (search.type == 'datetime') {
//                            var tmp  = (obj.parseField(rec, search.field + '_') instanceof Date ? obj.parseField(rec, search.field + '_') : obj.parseField(rec, search.field));
//                            var val1 = w2utils.formatDateTime(tmp, 'yyyy-mm-dd|hh24:mm:ss');
                            var val1 = w2utils.isDateTime(obj.parseField(rec, search.field), obj.getColumn(search.field).render.replace('datetime:', ''),true);
//                            var val2 = w2utils.formatDateTime(w2utils.isDateTime(val2, w2utils.settings.datetimeFormat, true), 'yyyy-mm-dd|hh24:mm:ss');
                            var val2 = w2utils.isDateTime(val2, w2utils.settings.datetimeFormat, true);
//                            if ( (val1.length == val2.length) && (val1 >= val2) ) fl++;
                            if ( val1.getTime() >= val2.getTime() ) fl++;
                        }
                        break;
                    case 'in':
                        var tmp = sdata.value;
                        if (sdata.svalue) tmp = sdata.svalue;
                        if (tmp.indexOf(val1) !== -1) fl++;
                        if (tmp.indexOf(w2utils.isFloat(val1b) ? parseFloat(val1b) : val1b) !== -1) fl++;
                        break;
                    case 'not in':
                        var tmp = sdata.value;
                        if (sdata.svalue) tmp = sdata.svalue;
                        if (tmp.indexOf(val1) == -1) fl++;
//                        if (tmp.indexOf(w2utils.isFloat(val1b) ? parseFloat(val1b) : val1b) == -1) fl++;
                        break;
                    case 'begins':
                    case 'begins with': // need for back compatib.
                        if (val1.indexOf(val2) === 0) fl++; // do not hide record
                        break;
                    case 'contains':
                        if (val1.indexOf(val2) >= 0) fl++; // do not hide record
                        break;
                    case 'not contains':
                        if (val1.indexOf(val2) < 0) fl++; // do not hide record
                        break;
                    case 'null':
                        if (obj.parseField(rec, search.field) == null) fl++; // do not hide record
                        break;
                    case 'not null':
                        if (obj.parseField(rec, search.field) != null) fl++; // do not hide record
                        break;
                    case 'ends':
                    case 'ends with': // need for back compatib.
                        var lastIndex = val1.lastIndexOf(val2);
                        if (lastIndex !== -1 && lastIndex == val1.length - val2.length) fl++; // do not hide record
                        break;
                    }
                }
                if ((obj.last.logic == 'OR' && fl !== 0) ||
                    (obj.last.logic == 'AND' && fl == obj.searchData.length))
                    return true;
                if (rec.w2ui && rec.w2ui.children && rec.w2ui.expanded !== true) {
                    // there are closed children, search them too.
                    for (var r = 0; r < rec.w2ui.children.length; r++) {
                        var subRec = rec.w2ui.children[r];
                        if (searchRecord(subRec))
                            return true;
                    }
                }
                return false;
            }

            // add parents nodes recursively
            function addParent(recid) {
                if (recid === undefined)
                    return;
                if (duplicateMap[recid])
                    return; // already visited
                duplicateMap[recid] = true;
                var i = obj.get(recid, true);
                if (i == null)
                    return;
                if ($.inArray(i, obj.last.searchIds) != -1)
                    return;
                var rec = obj.records[i];
                if (rec && rec.w2ui)
                    addParent(rec.w2ui.parent_recid);
                obj.last.searchIds.push(i);
            }
        }
