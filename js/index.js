window.index = true;
// #####################################################################
var AccessDir = window.location.pathname.substr(
      1,
      window.location.pathname.lastIndexOf("/")
    );
// #####################################################################
var DIR_MENU      = "menu",            // directory with menus
    DIR_LANG      = "locale",          // directory with languages
    DIR_THEMES    = "themes",          // directory with themes
    COOKIE_THEMES = "jquery-ui-theme", // cookies id

    SQL_BASE_DIR  = "data/turnen_sql/",
    SQL_SYS_BASE  = SQL_BASE_DIR + "turnen.sqlite",

    SQL_SYS_TABLE = "sys",
    SQL_SYS_USER  = "sys_user",
    SQL_SYS_GRP   = "sys_grp",

    SIGN_ADDRESS        = "Address",
    SIGN_TIME           = "Time",
    SIGN_CONCLUSION     = "Conclusion",
    SIGN_GYMNAME        = "GymName",
    SIGN_GYMTEST        = "GymTest",
    SIGN_GYMEVENT       = "GymEvent",

    SIGN_USER           = "User",
    SIGN_GRP            = "Group",
    SIGN_DATA           = "Data",

    UNIVERSUM     = "955db0b81ef1989b4a4dfeae8061a9a6",

    RESIZE_DELAY  = 100,  // ms delay of window resize event
    MESSAGE_DELAY = 3000, // ms delay by login fault
    REFRESH_TIME  = 500,  // ms
    MESSAGE_TIME  = 5,    // factor * number of messages = s
    DEBUG         = 1,    // debug level
    FS0,                  // start font size
    FS,                   // curent font size
    FSK           = 1.0,  // font size factor
    oldMenu       = null, // menu before last
    topics        = {},   // message system
    aError        = [],   // message queue
    oUser         = {},   // user data
    oAccess       = {};   // access data of user
// #####################################################################
var DEFAULT_LANG  = get_lang(),
    ACCESS_DEFAULT = {
      acc: true,
      edt: true,
      ins: true,
      del: true,
      rep: true
    },
    GOTO_GROUP_FILT   = null,
    GOTO_USERS_FILT   = null;
    WOCHE = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
// #####################################################################
// onload with jquery
function start(){
  FS0 = parseFloat($("html, body").css("font-size"));
  FS  = parseFloat(FS0 / 10);
  FSK = parseFloat($("html, body").css("font-size")) / $(window).height();
  // Theme -------------------------------------------------------------
  if($.cookie(COOKIE_THEMES)) {
    update_css(DIR_THEMES + "/" + $.cookie(COOKIE_THEMES) + "/jquery-ui.min.css");
  }
  // load login page ---------------------------------------------------
  $("body")
  .load("login.htm", login_init)
  .on("keydown", keyboard);
}
// #####################################################################
// keyboard
function keyboard(ev){
  if($("body>div.ui-widget-overlay").length){
    return;
  }
  var Key = ev.altKey << 10 | ev.ctrlKey << 9 | ev.shiftKey << 8 | ev.which;
  DEBUG > 1 && console.log($.sprintf("%04X", Key));
  switch(Key){
    case 0x208: // ctrl + backspace
      if(oldMenu)
        $('#id_Menu').tree("open", oldMenu);
      return false;
    case 0x64C: // ctrl + alt + L
      logout();
      return false;
    case 0x4BE: // alt + .
      $("*[accesskey='.']").click();
      ev.preventDefault();
      return false;
    case 0x4AB: // alt + +
      var fs = parseFloat($("body").css("font-size"));
      fs += FS;
      $("body").css("font-size", fs+"px");
      $(window).trigger("resize");
      return false;
    case 0x4AD: // alt + -
      var fs = parseFloat($("body").css("font-size"));
      fs -= FS;
      $("body").css("font-size", fs+"px");
      $(window).trigger("resize");
      return false;
    case 1072:  // Alt 0
      $("body").css("font-size", FS0+"px");
      $(window).trigger("resize");
      return false;
  }
}
// #####################################################################
// button events
function choice(el){
  var c = $(el).data("choice");
  switch(c){
    case "LOGOUT":
      logout();
      return;
    case "MENU":
      $("#id_Menu").parent().toggle();
      $(window).resize();
      break;
    case "CLOCK":
      window.Wclock = window.open(
        "clock.htm",
        _("Clock"),
        'scrollbars=yes,toolbar=no,width=650,height=300,resizable=yes'
      );
      break;
    default:
      console.log(c);
  }
}
// #####################################################################
// login page
function login_init(){
  // Locale ------------------------------------------------------------
  set_lang(DEFAULT_LANG);
  // Login -------------------------------------------------------------
  $("input[name=user]").focus();
  $("#id_Login_Form")
  .submit(function(ev){
    function login_fault(msg){
      $("#id_Login_Msg").html(msg);
      $("input[name=user]").focus();
      setTimeout(function(){
        $("#id_Login_Msg").text("");
      }, MESSAGE_DELAY);
    }
    var Form = this;
    user_load(Form, login_fault, main_init);
    return false;
  });
  $("#id_Login_Button").button();
}
// #####################################################################
// main page
function main_init(){
  if(oUser.theme == "")
    oUser.theme = "base";
  // User --------------------------------------------------------------
  $("#id_User").text(oUser.dbuser);
  var locStr = DIR_THEMES + "/" + oUser.theme + "/jquery-ui.min.css";
  update_css(locStr);
  // Buttons -----------------------------------------------------------
  $("button").button();
  $("button,i.fa-clock-o").click(function(ev){
    choice(this);
  });
  // Window events -----------------------------------------------------
  $(window)
  .on("beforeunload", function(ev){
    user_save();
    return "OK?";
  })
  .resize(function(ev){
    if(window.resize_timer)
      clearTimeout(window.resize_timer);
    window.resize_timer = setTimeout(function(){
      $.Topic("resizeWindow").publish();
      DEBUG > 1 && console.log("resizeWindow");
    }, RESIZE_DELAY);
  });
  // Menu --------------------------------------------------------------
  $('#id_Menu')
  .tree({
    top:
      '<div style="-moz-box-sizing:border-box;-webkit-box-sizing:border-box;box-sizing:border-box;font-size:0.8em;text-align:left;width:100%;border-top-width:0;border-left-width:0;border-right-width:0;padding:0.2em;border-bottom-width:1px" class="ui-widget ui-widget-header ui-corner-top">'+
        '<button class="icon lang-title" title="Refresh" data-choice="REFRESH">'+
          '<i class="fa fa-refresh"></i>'+
        '</button>'+
        '<button class="icon lang-title" title="Open" data-choice="OPEN_CLOSE">'+
          '<i class="fa fa-folder"></i>'+
        '</button>'+
      '</div>'+
      '',
    labelFun: function(x){
      return x.replace(/[^_]*_/, "").replace(/[.][^.]*$/, "");
    },
    data: function(options, callBack){
      menu_make(oAccess, callBack);
    },
    chck: false,
    render: function(ev, ui){
      var self = this;
      // top button open/close menus
      $("button", ui.element)
      .button()
      .off("click")
      .on("click", function(ev){
        var c = $(this).data("choice");
        switch(c){
          case "OPEN_CLOSE":
            if($("i", this).hasClass("fa-folder-open")){
              $(this).prop("title", _("Open"));
              $("i", this)
                .removeClass("fa-folder-open")
                .addClass("fa-folder");
              $(self).tree("close");
            } else {
              $(this).prop("title", _("Close"));
              $("i", this)
                .removeClass("fa-folder")
                .addClass("fa-folder-open");
              $(self).tree("open");
            }
            break;
          case "REFRESH":
            $(self).tree('refresh');
            break;
        }
      });
      // resizable
      $(ui.element)
      .resizable({
        handles: "e",
        stop: function(ev, ui){
          $.Topic("resizeWindow").publish();
        }
      });
      // Refresh all
      $.Topic("resizeWindow").publish();
      // Locale
      set_lang(oUser.lang);
      // open las/default menu
      if(typeof oUser.menu == "undefined" || oUser.menu == "")
        oUser.menu = $("input", ui.element).eq(0).data().menu;
      $(ui.element)
      .tree("open", $("input[data-menu='"+oUser.menu+"']", ui.element));
    },
    select: menu_load
  });
  // resize event
  $.Topic("resizeWindow").subscribe(function(val){
    var $menu = $("#id_Menu");
    var $div = $("#id_Content>div").filter(":visible");
    $menu.height(10);
    $div.height(10);
    var H = $div.parent().height();
    $menu.height(H - 2);
    $div.height(H - 2);
    DEBUG > 1 && console.log("resizeWindow");
  });
  // refresh timer
  refresh_timer();
}
// #####################################################################
// dir => menu
function menu_make(access, callBack){
  $.post("/dir", {path: AccessDir + DIR_MENU}, function(data){
    var aM = data.split("\n"),
        oM = {};
    // .................................................................
    function insert(m, o){
      var t = m.split("_");
      for(var x in o){
        var ot = x.split("_");
            k = t[0].substr(0, ot[0].length);
        if(ot[0] == k){
          if(!$.isPlainObject(o[x]))
            o[x] = {};
          insert(m, o[x]);
          return ;
        }
      }
      o[m] = "";
    }
    // .................................................................
    aM.sort(function(a, b){
      a = a.split("_")[0];
      b = b.split("_")[0];
      return a > b ? 1 : a < b ? -1 : 0;
    });
    // .................................................................
    for(var i in aM){
      if(aM[i] == "")
        continue;
      if(typeof oAccess[aM[i]] == "undefined")
        oAccess[aM[i]] = ACCESS_DEFAULT;
      if(!oAccess[aM[i]].acc)
        continue;
      insert(aM[i], oM);
    }
    callBack(oM);
  }, "text");
}
// #####################################################################
// load content
function menu_load(ev, ui){
  var newMenuFile = $(ui.newMenu).data("menu");
  if(typeof oAccess[newMenuFile] == "undefined")
    oAccess[newMenuFile] = ACCESS_DEFAULT;
  if(!oAccess[newMenuFile].acc)
    return;
  oUser.menu = newMenuFile;
  $("#id_Content>div").hide();
  var div_menu = $("#id_Content>div").filter('[data-menu="'+newMenuFile+'"]');
  if(div_menu.length == 0){
    var path = DIR_MENU + "/" + encodeURIComponent(newMenuFile);
    var div = $('<div data-menu="'+newMenuFile+'"] class="ui-widget-content ui-corner-all">');
    $("#id_Content").append(div)
    div_menu = $("#id_Content>div").filter('[data-menu="'+newMenuFile+'"]')
    .load(path, function(){
      change_all_lang(this);
    });
  } else {
    div_menu.show();
  }
  oldMenu = ui.oldMenu;
  // select menu + resize
  $.Topic("selectMenu").publish(ui);
  $(window).trigger("resize");
}
// #####################################################################
// messages queues
jQuery.Topic = function( id ) {
  var callbacks,
      topic = id && topics[id];
  if(!topic) {
    callbacks = jQuery.Callbacks("unique");
    topic = {
      publish:     callbacks.fire,
      subscribe:   callbacks.add,
      unsubscribe: callbacks.remove
    };
    if(id){
      topics[id] = topic;
    }
  }
  return topic;
};
// #####################################################################
// refresh timer
function refresh_timer(){
  var T = date_time();
  T = $.sprintf("%s %s", T.D, T.T);
  if(T != this.Tpre){
    // time
    $("#id_Time").text(T);
    this.Tpre = T;
    // messages
    if(!$.isNumeric(this.iError)){
      this.iError = 0;
      this.nError = MESSAGE_TIME;
    }
    if(aError.length){
      if(this.iError >= 0)
        $("#id_Msg").text(aError[this.iError++]);
      if(this.iError >= aError.length){
        this.iError = 0;
        if(--this.nError == 0){
          this.nError = MESSAGE_TIME;
          aError.shift();
        }
      }
    } else {
      $("#id_Msg").text("");
      this.iError = 0;
    }
  }
  delete T;
  if(window.timer)
    clearTimeout(window.timer);
  window.timer = setTimeout(refresh_timer, REFRESH_TIME);
  $.Topic("refreshTimer").publish();
}
// #####################################################################
// change css
function update_css(locStr){
  var cssLink = $('<link href="'+locStr+'" type="text/css" rel="Stylesheet" class="ui-theme">');
  $("head").append(cssLink);
  if($("link.ui-theme").length > 3)
    $("link.ui-theme:first").remove();
}
// #####################################################################
// logout = save user data + reload
function logout(){
  $.Topic("logout").publish();
  $(window).off("beforeunload");
  user_save(function(){
    setTimeout("window.location.reload()", 10);
  });
}
// #####################################################################
// load data from server
function loadDataRemote(fileName, callBack, fileType){
  var request = $.ajax(fileName, {
    type:        "GET",
    contentType: fileType ? fileType : "text/plain",
    mimeType:    "text/plain; charset=x-user-defined",
    error: function(err){
      aError.push($(err.responseText).text());
      console.error(fileName, err);
    }
  });
  request.done(function(data){
    callBack(data);
  });
}
/*
function loadDataRemote(File, callBack){
  $.getJSON(File, function(D, textStatus, jqXHR){
    if(callBack)
      callBack(D);
  }, "json").fail(function(err){
    aError.push($(err.responseText).text());
  });
}
*/
// #####################################################################
// save data to server
function saveDataRemote(fileData, fileName, callBack, fileType){
//  fileName = AccessDir + fileName;
  $.ajax({
    type:        'POST',
    url:         "/sto/" + fileName,
//    url:         "/sto/" + encodeURIComponent(fileName),
    data:        {encode: "base64", data: btoa(fileData)},
    dataType:    "json",
    success: function(data, textStatus, xhr) {
      if(callBack)
        callBack(data);
    },
    error: function (xhr, textStatus, errorThrown) {
      aError.push($(textStatus).text());
    }
  });
return;
/*
  $.ajax({
    type:        "POST",
    url:         "/sto/" + encodeURIComponent(fileName),
    data:        fileData, //JSON.stringify(Data),
    contentType: "multipart/form-data",
    mimeType:    "text/plain; charset=x-user-defined",
    dataType:    "json",
    processData: false,
    success:     function(msg) {
      if(callBack)
        callBack(msg);
    }
  }).fail(function(err){
    aError.push($(err.responseText).text());
  });
*/
}
// #####################################################################
function loadDataLocal(callBack, readAs){
// load data from local host
  if($("#id_FileUpload").length)
    $("#id_FileUpload")
    .off()
    .remove();
  $("body").append('<input id="id_FileUpload" type="file" style="width:0">');
  $("#id_FileUpload")
  .on("change", function(){
    $(this).off();
    var File = this.files[0];
    var R = new FileReader();
    R.onloadend = (function(theFile){
      return function(er) {
        callBack(R.result);
      };
    })(File);
    // readAsDataURL, readAsArrayBuffer, readAsBinaryString, readAsText
    if(readAs)
      R[readAs](File);
    else
      R.readAsText(File);
  });
  $("#id_FileUpload").click();
}
// #####################################################################
function saveDataLocal(fileData, fileName, fileType){
// save data to local host
  var $dialog = $('<div>')
  .html(
    '<input type="text" name="FileSave" class="ui-corner-all" style="width:100%;border:1px solid silver" value="'+fileName+'">'+
    '<div class="ui-state-error ui-corner-all" style="display:none;padding: 0 .7em;;margin-top:5px"></div>'
  );
  $dialog
  .dialog({
    width: "auto",
    title: _("Save as"),
    modal: true,
    closeOnEscape: true,
    resizable: false,
    buttons: [{
      text: _("Download"),
      click: function(){
        var V = $("input[name=FileSave]", $dialog).val();
        if(V == ""){
          $("div.ui-state-error").text(_("Filename has to be defined...")).show();
          return;
        }
        var blob = new Blob(
          [fileData],
          {type: fileType ? fileType : "text/plain;charset=utf-8"}
        );
        saveAs(blob, V);
        $(this).dialog("close");
      }
    },{
      text: _("Cancel"),
      click: function(){
        $(this).dialog("close");
      }
    }],
    close: function( ev, ui ){
      $(this).dialog("destroy");
    }
  });
}
// #####################################################################
// german comparison
function stringComparison(a, b) {
  a = a.toLowerCase();
  a = a.replace(/ä/g,"a");
  a = a.replace(/ö/g,"o");
  a = a.replace(/ü/g,"u");
  a = a.replace(/ß/g,"s");

  b = b.toLowerCase();
  b = b.replace(/ä/g,"a");
  b = b.replace(/ö/g,"o");
  b = b.replace(/ü/g,"u");
  b = b.replace(/ß/g,"s");

  return(a==b)?0:(a>b)?1:-1;
}
// #####################################################################
