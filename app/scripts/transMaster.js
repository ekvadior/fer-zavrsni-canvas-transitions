/* global html2canvas, $, _, dat */
'use strict';

var $b = $('body');
var w = window;

var DEFAULTS = {
  transitionType: 'box-transition',
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
  $tempCont.css('background', self._options.background);
  $tempCont.children().show();

  $b.append($tempCont);

  html2canvas($tempCont.get(0), {
    logging: self._options.debug,
    width: w.innerWidth,
    height: w.innerHeight,
    onrendered: function(canvas) {
      onComplete.call(self, canvas);
      $tempCont.remove();
    }
  });
};

TransMaster.prototype._init = function(options) {
  var o = options;

  if (o.debug) {
    this.gui = new dat.GUI();

    this.gui.add(o, 'transitionType');
  }

  this.$pc = $(o.pageContainer);
  this._options = o;
  this._prepareDOM();
  this._generatePages();
  this._initTransitions();
};

TransMaster.prototype._prepareDOM = function() {
  var self = this;
  $b.addClass('trans-body');

  this.$overlay = $('<div class="trans-overlay"></div>');
  this.$overlay.css('background', this._options.background);
  $b.append(this.$overlay);

  _.each(this._options.pages, function(page) {
    page.el = $(page.container);

    if (page.current) {
      self._currentPage = page;
      $(self._currentPage.el).show();
    } else {
      self._removePage(page);
    }
  });
};


TransMaster.prototype._initTransitions = function() {
  this._transitions = {};
  this._transitionTemp = {};
};

TransMaster.prototype._generatePages = function() {
  var self = this;
  var pages = this._options.pages;
  _.each(pages, function(page) {
    self._renderPageToCanvas(page.el, function(canvas) {
      page.canvas = canvas;
      page.image = canvas.toDataURL('image/jpeg', 1.0);
    });
  });
};

TransMaster.prototype._transition = function(transType, currentPage, nextPage) {
  var self = this;
  var time = Date.now();

  //Set up transition options
  self._transitionTemp = {
    o: self._transitions[transType].options
  };

  self._transitions[transType].beforeTransition.call(self, currentPage, nextPage, function(status) {
    if (self._options.debug) {
      console.log(status);
      console.log('Elapsed time: ' + ((Date.now() - time) ) + 'ms');
    }
    time = Date.now();
    self._removePage(currentPage);

    self._transitions[transType].doTransition.call(self, currentPage, nextPage, function(status) {
      if (self._options.debug) {
        console.log(status);
        console.log('Elapsed time: ' + ((Date.now() - time) ) + 'ms');
      }
      time = Date.now();

      self._transitions[transType].afterTransition.call(self, currentPage, nextPage, function(status) {
        if (self._options.debug) {
          console.log(status);
          console.log('Elapsed time: ' + ((Date.now() - time) ) + 'ms');
        }

        self._putPage(nextPage);
        self._currentPage = nextPage;
      });
    });
  });
};

TransMaster.prototype._removePage = function(page) {
  this.$pc.find(page.container).remove();
};

TransMaster.prototype._putPage = function(page) {
  this.$pc.append(page.el);

  $(w).scrollTop(0);
  $(page.el).show();
};

TransMaster.prototype.includeTransition = function(transition, options) {
  var transOptions = _.extend(transition.options, options);

  if (this._options.debug) {
    var g = this.gui;

    var f = g.addFolder(transition.name);

    _.each(transOptions, function(v, k) {
      f.add(transOptions, k);
    });
  }

  this._transitions[transition.name] = {
    options: transOptions,
    beforeTransition: transition.beforeTransition,
    doTransition: transition.doTransition,
    afterTransition: transition.afterTransition
  };
};

TransMaster.prototype.goToPage = function(pageName) {
  var self = this;
  if (this._currentPage.canvas && this._getPage(pageName).canvas) {
    this._transition(this._options.transitionType, this._currentPage, this._getPage(pageName));
  } else {
    setTimeout(function() {
      self.goToPage(pageName);
    }, self._options.renderTimeout);
  }
};
