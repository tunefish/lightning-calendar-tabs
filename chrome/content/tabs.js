"use strict";

/*
    This file is part of Lightning Calendar Tabs extension.

    Lightning Calendar Tabs is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    Lightning Calendar Tabs is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with Lightning Calendar Tabs.  If not, see <http://www.gnu.org/licenses/>.
*/

/*
	Lightning Calendar Tabs

	a plugin to add tabs in calendar view into Lightning calendar plugin for Mozilla Thunderbird
	(c) 2012, Jiri Lysek

	jlx@seznam.cz
*/

var LightningCalendarTabs = LightningCalendarTabs || {};

(function() {

	Components.utils["import"]("resource://calendar/modules/calUtils.jsm");
	
	LightningCalendarTabs.tabsController = function() {
		this.arrowscrollbox = null;
		this.tabBox = null;
		this.tabs = null;

		this.monthTabs = null;
		this.multiWeekTabs = null;
		this.weekTabs = null;
		this.dayTabs = null;

		this.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

		this.currentTabs = null;

		this.visible = false;
	};

	/**
	 * attach events
	 * 
	 * @returns {undefined}
	 */
	LightningCalendarTabs.tabsController.prototype.startup = function() {
	
		var tabs = document.getElementById("view-tabs");
		
		if(tabs) {
			var self = this;
			var viewTabs = document.getElementById("view-tabs");

			getViewDeck().addEventListener("viewloaded", function(event) {
				self.decideTabsVisibility();
			}, false);
			getViewDeck().addEventListener("dayselect", function() {
				self.updateTabs();
			}, false);
			//attach to lightning's tabs select event to switch tab type
			viewTabs.addEventListener("select", function() {
				self.decideTabsVisibility();
			});
			this.createTabBox();
			
			this.initializeTabControllers();
		}
	};

	LightningCalendarTabs.tabsController.prototype.initializeTabControllers = function() {
		var stringBundleService = Cc["@mozilla.org/intl/stringbundle;1"].getService(Ci.nsIStringBundleService);
		var stringBundle = stringBundleService.createBundle("chrome://lightningcalendartabs/locale/overlay.properties");

		this.monthsEnabled = this.prefs.getBoolPref("extensions.lightningcalendartabs.tabs.months.enabled");
		this.multiWeeksEnabled = this.prefs.getBoolPref("extensions.lightningcalendartabs.tabs.multiweeks.enabled");
		this.weeksEnabled = this.prefs.getBoolPref("extensions.lightningcalendartabs.tabs.weeks.enabled");
		this.daysEnabled = this.prefs.getBoolPref("extensions.lightningcalendartabs.tabs.days.enabled");
		this.otherDateTabEnabled = this.prefs.getBoolPref("extensions.lightningcalendartabs.tabs.show_other_tab");

		if(this.monthsEnabled) {
			this.pastMonths = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.months.past"));
			this.futureMonths = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.months.future"));

			this.monthTabs = new LightningCalendarTabs.monthTabs(this.pastMonths, this.futureMonths, this.otherDateTabEnabled, stringBundle);
		} else {
			this.monthTabs = null;
		}

		if(this.multiWeeksEnabled) {
			this.pastMultiWeeks = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.multiweeks.past"));
			this.futureMultiWeeks = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.multiweeks.future"));

			this.multiWeekTabs = new LightningCalendarTabs.multiWeekTabs(this.pastMultiWeeks, this.futureMultiWeeks, this.otherDateTabEnabled, stringBundle);
		} else {
			this.multiWeekTabs = null;
		}

		if(this.weeksEnabled) {
			this.pastWeeks = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.weeks.past"));
			this.futureWeeks = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.weeks.future"));

			this.weekTabs = new LightningCalendarTabs.weekTabs(this.pastWeeks, this.futureWeeks, this.otherDateTabEnabled, stringBundle);
		} else {
			this.weekTabs = null;
		}

		if(this.daysEnabled) {
			this.pastDays = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.days.past"));
			this.futureDays = Math.max(0, this.prefs.getIntPref("extensions.lightningcalendartabs.tabs.days.future"));

			this.dayTabs = new LightningCalendarTabs.dayTabs(this.pastDays, this.futureDays, this.otherDateTabEnabled, stringBundle);
		} else {
			this.dayTabs = null;
		}
	};

	/**
	 * hide or show tabs depending on what user view user selected and if this tabs are enabled in options
	 * 
	 * @returns {undefined}
	 */
	LightningCalendarTabs.tabsController.prototype.decideTabsVisibility = function() {
		this.selectCurrentController();
		if(this.currentTabs !== null) {
			this.showTabBox();
		} else {
			this.hideTabBox();
		}
	};

	/**
	 * select controller depending on user selection
	 * 
	 * @returns {undefined}
	 */
	LightningCalendarTabs.tabsController.prototype.selectCurrentController = function() {
		var buttMonth = document.getElementById("calendar-month-view-button");
		var buttWeek = document.getElementById("calendar-week-view-button");
		var buttDay = document.getElementById("calendar-day-view-button");
		var buttMultiWeek = document.getElementById("calendar-multiweek-view-button");

		var newTabs = null;

		if(buttMonth.getAttribute("selected")) {
			newTabs = this.monthTabs;
		}
		if(buttMultiWeek.getAttribute("selected")) {
			newTabs = this.multiWeekTabs;
		}
		if(buttWeek.getAttribute("selected")) {
			newTabs = this.weekTabs;
		}
		if(buttDay.getAttribute("selected")) {
			newTabs = this.dayTabs;
		}

		if(newTabs != this.currentTabs) {
			this.hideTabBox();
			this.currentTabs = newTabs;
		}
	};

	LightningCalendarTabs.tabsController.prototype.createTabBox = function() {
		this.arrowscrollbox = document.createElement("arrowscrollbox");
		this.arrowscrollbox.setAttribute("orient", "horizontal");
		this.arrowscrollbox.setAttribute("class", "lightning-calendar-tabs-tabs-container");

		this.tabBox = document.createElement("tabbox");

		this.tabs = document.createElement("tabs");

		var calendar = document.getElementById("calendar-view-box");
		var viewDeck = document.getElementById("view-deck");
		
		calendar.insertBefore(this.arrowscrollbox, viewDeck);

		this.arrowscrollbox.appendChild(this.tabBox);
		this.tabBox.appendChild(this.tabs);
	};

	LightningCalendarTabs.tabsController.prototype.showTabBox = function() {
		if(!this.visible && this.currentTabs !== null && this.tabBox && this.tabs) {
			this.currentTabs.show(this.tabs);
			this.currentTabs.update(this.tabs);
			this.visible = true;
			this.tabBox.style.display = "block";
		}
	};

	LightningCalendarTabs.tabsController.prototype.hideTabBox = function() {
		if(this.visible) {
			this.clearTabBoxContent();
			this.visible = false;
		}
	};

	LightningCalendarTabs.tabsController.prototype.clearTabBoxContent = function() {
		while(this.tabs.firstChild) {
			this.tabs.removeChild(this.tabs.firstChild);
		}
		this.tabBox.style.display = "none";
	};

	/**
	 * select actual tab on day selection in calendar
	 * 
	 * @returns {undefined}
	 */
	LightningCalendarTabs.tabsController.prototype.updateTabs = function() {
		if(this.currentTabs !== null && this.tabs) {
			this.currentTabs.update(this.tabs);
		}
	};

	//--------------------------------------------------------------------------

	/**
	 * callback for options update
	 * 
	 * @returns {undefined}
	 */
	LightningCalendarTabs.tabsController.prototype.updatePrefs = function() {
		this.initializeTabControllers();
		this.hideTabBox();
		this.selectCurrentController();
		this.showTabBox();
	};
	
	//--------------------------------------------------------------------------
	
	LightningCalendarTabs.tabs = function(otherDateTabEnabled) {
		this.tabs = [];
		this.otherDateTabEnabled = otherDateTabEnabled;
		this.otherTab = null;
		this.formatter = cal.getDateFormatter();
	};
	
	LightningCalendarTabs.tabs.prototype.show = function() {
		if(this.otherDateTabEnabled) {
			this.otherTab = document.createElement('tab');
			this.otherTab.collapse = true;
		}
	};
	
	LightningCalendarTabs.tabs.prototype.update = function(tabs) {
		this.highlightCurrent(tabs);
	};

	LightningCalendarTabs.tabs.prototype.highlightCurrent = function(tabs) {
		var dateStart = currentView().rangeStartDate;
		if(dateStart) {
			this.updateTabsState(tabs, new Date(Date.UTC(dateStart.year, dateStart.month, dateStart.day)));
		}
	};

	LightningCalendarTabs.tabs.prototype.updateTabsState = function(tabs, date) {
		for(var i = 0; i < this.tabs.length; i++) {
			if(this.dateEqual(date, this.tabs[i].date)) {
				this.hideOtherTab(tabs);
				tabs.selectedIndex = i;
				return;
			}
		}
		this.updateOtherTab(tabs, date);
	};

	LightningCalendarTabs.tabs.prototype.updateOtherTab = function(tabs, date) {
		if(this.otherDateTabEnabled && this.tabs.length > 0) {
			if(date.getTime() < this.tabs[0].date) {
				tabs.insertBefore(this.otherTab, tabs.firstChild);
				tabs.selectedIndex = 0;
			} else {
				tabs.appendChild(this.otherTab);
				tabs.selectedIndex = tabs.itemCount - 1;
			}
			this.makeTabLabel(this.otherTab, date);
			this.otherTab.collapsed = false;
			LightningCalendarTabs.tabUtils.prepareTabVisual(this.otherTab, tabs.selectedIndex == 0 ? -1 : 1, date, this.periodType);
		}
	};
	
	LightningCalendarTabs.tabs.prototype.hideOtherTab = function(tabs) {
		if(this.otherDateTabEnabled && this.otherTab.parentNode) {
			tabs.removeChild(this.otherTab);
		}
	};
	
	//--------------------------------------------------------------------------

	/**
	 * init
	 */
	window.addEventListener("load", function(e) {
		var lct = new LightningCalendarTabs.tabsController();
		lct.startup();

		var prefListener = new LightningCalendarTabs.prefObserver("extensions.lightningcalendartabs.tabs.",
			function(branch, name) {
				lct.updatePrefs();
			}
		);
		prefListener.register();
		var prefListenerWeekStart = new LightningCalendarTabs.prefObserver("calendar.week.start",
			function(branch, name) {
				lct.updatePrefs();
			}
		);
		prefListenerWeekStart.register();
	}, false);

})();