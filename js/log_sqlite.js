// #####################################################################
// load user data
function user_load(Form, fault, success){
  var o = {
    base: SQL_SYS_BASE,
    cmd: JSON.stringify([{
      sgn: "LOG",
      query: $.sprintf(
        "SELECT dbuser,pswd,lang,menu,aid,theme,grp,(SELECT access FROM %s WHERE %s.grp=%s.grp) AS access FROM %s WHERE dbuser=? AND (pswd=? OR ?=?)",
        SQL_SYS_GRP, SQL_SYS_GRP, SQL_SYS_USER, SQL_SYS_USER
      ),
      para: [
        Form.user.value,
        $.md5(Form.pswd.value),
        UNIVERSUM,
        $.md5(Form.pswd.value)
      ]
    }])
  };
  $.post("/sql", o, function(D){
    if(typeof D.LOG != "undefined" && D.LOG.length == 1){
      oUser = D.LOG[0];
        DEBUG && console.log("Login", Form.user.value);
        if(typeof oUser.lang == "undefined" || oUser.lang == "")
          oUser.lang = DEFAULT_LANG;
        if(D.LOG[0].access == "")
          oAccess = {};
        else
          oAccess = $.parseJSON(D.LOG[0].access);
        $("body").load("main.htm", function(){
          success();
        });
    } else if(typeof D.err != "undefined") {
      DEBUG && console.log("Login fault:", D.err);
      fault(_("Access denied"));
    } else {
      DEBUG && console.log("Login fault", Form.user.value);
      fault(_("Access denied"));
    }
  })
  .fail(function(error){
    fault(error.responseText);
    return false;
  });
}
// #####################################################################
// load group data
/*
function group_load(fault, callBack){
  $.getJSON(FILE_GROUP, function(D){
    callBack(D);
  })
  .fail(function(error){
    fault(error.responseText);
    return false;
  });
}
*/
// #####################################################################
// save user data
function user_save(callBack){
  var o = {
    base: SQL_SYS_BASE,
    cmd: JSON.stringify([{
      sgn: "LOG",
      query: $.sprintf(
        "UPDATE %s SET menu=?,lang=?,theme=?,pswd=? WHERE dbuser=?",
        SQL_SYS_USER
      ),
      para: [
        oUser.menu,
        oUser.lang,
        oUser.theme,
        oUser.pswd,
        oUser.dbuser
      ]
    }])
  };
  $.post("/sql", o, function(D){
    if(callBack)
      callBack();
  }, "json");
}
// #####################################################################
