function Store (initialState) {
  var logger = Logger.get('Store');
  this.state = initialState;
};

Store.prototype = {
  getState: function() {
    return this.state;
  }
};
