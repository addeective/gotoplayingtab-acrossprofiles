var tabMgr = {
  initialize:function(){
    try{
      chrome.contextMenus.create({
        "id":"000000",
        "title": "Close playing tabs",
        "contexts": ["action"]
      });
      chrome.contextMenus.onClicked.addListener(()=>this.closeTabs())
    }
    catch (e){
    }
    chrome.commands.onCommand.addListener((command) => {
      if (command == "goto_tab") {
          this.gotoTab();
      } else if (command == "close_tabs") {
          this.closeTabs();
      }
    });
    
    chrome.action.onClicked.addListener((tab) => {
      this.gotoTab();
    });
  },
  getLocalTabs:async function(){
    var tabs = await chrome.tabs.query({});
    return tabs.map(tab => {
      return {id:tab.id,local:true, audible:tab.audible, active: tab.active, windowId: tab.windowId, tab};
    })
  }, 
  getAllTabs:function(){
    return this.getLocalTabs();
  },
  getLastFocusedWindow:async function(){
    return chrome.windows.getLastFocused().then(w => {
      return {id:w.id,local:true, window: w}
    });
  },
  gotoTab:async function(){
    var possibleTabs = [];
    let lastFocusedWin =  await this.getLastFocusedWindow();
    var currentPlayingTab = false;
    var tabs = await this.getAllTabs();
    // determines if the current active tab is playing audio
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].audible) {
        if (tabs[i].active && tabs[i].windowId == lastFocusedWin.id) {
          currentPlayingTab = tabs[i];
          break;
        }
      }
    }
    // determines the list of audible tabs other than current playing tab 
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].audible) {
        if (tabs[i] !== currentPlayingTab) {
          possibleTabs.push(tabs[i]);
        }
      }
    }
    if (possibleTabs.length) { // if there are other candidates
      // lets group possible tabs by windows
      var windowTabs = {};
      var currentWindowId = possibleTabs[0].windowId;
      windowTabs[currentWindowId] = [];
      for (var i = 0; i < possibleTabs.length; i++) {
          if (possibleTabs[i].windowId !== currentWindowId) {
            currentWindowId = possibleTabs[i].windowId;
            windowTabs[currentWindowId] = [];
          }
          windowTabs[currentWindowId].push(possibleTabs[i]);
      }
      if (windowTabs[lastFocusedWin.id] === undefined) {
        windowTabs[lastFocusedWin.id] = [];
      }
      var keys = Object.keys(windowTabs).sort();
      if (keys[0] !== String(lastFocusedWin.id)) {
        var ind = keys.indexOf(String(lastFocusedWin.id));
        var tail = keys.slice(ind + 1);
        keys.splice(ind);
        var winids = [String(lastFocusedWin.id)].concat(tail).concat(keys);
      } else {
        var winids = keys;
      }
      for (var i = 0; i < winids.length; i++) {
        for (var j = 0; j < windowTabs[winids[i]].length; j++) {
          var tab = windowTabs[winids[i]][j];
          if (currentPlayingTab) {
            if (tab.windowId === currentPlayingTab.windowId) {
              if (tab.index > currentPlayingTab.index) {
                this.raiseTab(tab)
                return;
              }
            } else {
              this.raiseTab(tab)
              return;
            }
          } else {
            this.raiseTab(tab)
            return;
          }
        }
      }
      this.raiseTab(possibleTabs[0]);
      return;
    } else { // there are no other candidate tabs
      if (currentPlayingTab.audible) {
        this.raiseTab(currentPlayingTab);
        return;
      }
    }
  },
  raiseTab:function(tab){
    if (tab.local){
      chrome.tabs.update(tab.id, {
        active: true
      });
      chrome.windows.update(tab.windowId, {
        focused: true
      });
    }
  },
  closeTabs:async function() {
    let win = await chrome.windows.getLastFocused();
    var last_audible = false;
    var audible_count = 0;
    let tabs = await chrome.tabs.query({});
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].audible) {
        last_audible = tabs[i];
        audible_count += 1;
        if (tabs[i].active && tabs[i].windowId == win.id) {
          continue;
        } else {
          chrome.tabs.remove(tabs[i].id);
        }
      }
    }
    if (last_audible && audible_count == 1) {
      chrome.tabs.remove(last_audible.id);
      return;
    }
  }
}

tabMgr.initialize();