/* global $, TransMaster */

'use strict';
var TM = new TransMaster({
  transitionType: 'city-transition',
  pages: [
    {
      current: true,
      name: 'first',
      container: '.trans-js-page-1',
      // transition: 'plane-wobble-transition'
    },
    {
      name: 'second',
      container: '.trans-js-page-2',
      // transition: 'box-transition'
    },
    {
      name: 'third',
      container: '.trans-js-page-3'
    }
  ],
  debug: true,
  background: '#FFFFFF',
  pageContainer: 'body',
});

$('body').on('click', '.js-change-page', function() {
  var $this = $(this);
  TM.goToPage($this.data('page'));
});

$('body').on('click', '.js-map', function() {
  TM.openMap();
});

window.tm = TM;

