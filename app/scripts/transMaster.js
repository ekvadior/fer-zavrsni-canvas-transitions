/* global html2canvas, $, _, moment */
'use strict';

var $b = $('body');
var w = window;

var CONST = {
  TRANSITIONS: {
    BOX: 1
  }
};

var DEFAULTS = {
  transitionType: CONST.TRANSITIONS.BOX,
  pages: [
    {
      current: true,
      name: 'first',
      container: '.trans-js-page-1'
    },
    {
      name: 'second',
      container: '.trans-js-page-2'
    }
  ],
  debug: false,
  background: '#FFFFFF',
  pageContainer: 'body',
  renderTimeout: 1 * 1000
};

function TransMaster(options) {
  this._init(_.extend(DEFAULTS, options));
}

TransMaster.prototype._getPage = function(name) {
  return _.find(this._options.pages, function(p) {
    return p.name === name;
  });
};

TransMaster.prototype._renderPageToCanvas = function(pageEl, onComplete) {
  var self = this;
  var $page = $(pageEl);

  var $tempCont = $('<div class="trans-temp-container"></div>');
  $tempCont.html($page.clone().get(0));
  $tempCont.children().show();

  $b.append($tempCont);

  html2canvas($tempCont.get(0), {
    logging: self._options.debug,
    onrendered: function(canvas) {
      onComplete.call(self, canvas);
      $tempCont.remove();
    }
  });
};

TransMaster.prototype._init = function(options) {
  var o = options;
  this.$pc = $(o.pageContainer);
  this._options = o;
  this._prepareDOM();
  this._generatePages();
  this._initTranistions();
};

TransMaster.prototype._prepareDOM = function() {
  var self = this;
  $b.addClass('trans-body');
  this.$overlay = $('<div class="trans-overlay"></div>');
  this.$overlay.css('background', this._options.background);
  $b.append(this.$overlay);

  _.each(this._options.pages, function(page) {
    page.el = $(page.container);
    if(page.current) {
      self._currentPage = page;
      $(self._currentPage.el).show();
    } else {
      self._removePage(page);
    }
  });
};

TransMaster.prototype._initTranistions = function() {
  var self = this;
  this._transitions = {};
  this._transitions[CONST.TRANSITIONS.BOX] = function(cur, next, callback) {
    callback.call(self, 'Transition went ok.');
  };
};

TransMaster.prototype._generatePages = function() {
  var self = this;
  var pages = this._options.pages;
  _.each(pages, function(page) {
    self._renderPageToCanvas(page.el, function(canvas) {
      page.canvas = canvas;
      page.image = canvas.toDataURL();
    });
  });
};

TransMaster.prototype._transition = function(transType, currentPage, nextPage) {
  var self = this;
  var time = Date.now();
  this._transitions[transType].call(this, currentPage, nextPage, function(status) {
    if(self._options.debug) {
      console.log(status);
      console.log('Elapsed time: ' + ((Date.now() - time) ) + 'ms');
    }
    self._removePage(currentPage);
    self._putPage(nextPage);
    self._currentPage = nextPage;
  });
};

TransMaster.prototype.goToPage = function(pageName) {
  var self = this;
  if(this._currentPage.canvas && this._getPage(pageName).canvas) {
    this._transition(this._options.transitionType, this._currentPage, this._getPage(pageName));
  } else {
    setTimeout(function() {
      self.goToPage(pageName);
    }, self._options.renderTimeout);
  }
};


TransMaster.prototype._removePage = function(page) {
  this.$pc.find(page.container).remove();
};

TransMaster.prototype._putPage = function(page) {
  this.$pc.append(page.el);
  $(w).scrollTop(0);
  $(page.el).show();
};

//###### DEVELOPMENT CODE #######
window.tm = new TransMaster({
  debug: true
});

window.showCanvas = function() {
  document.body.appendChild(window.tm._options.pages[0].canvas);
  document.body.appendChild(window.tm._options.pages[1].canvas);
};