const version = "2.9.3"
var text = $clipboard.text
var name = $addin.current.name
var delay = 0
var pgOffset = "";
var apiKey = $cache.get("apiKey")
var tableName = $cache.get("tableName")
var viewName = $cache.get("viewName")
var pageSize = $cache.get("pageSize")
var baseName = $cache.get("baseName")
var airUrl = `https://api.airtable.com/v0/${baseName}/${tableName}?pageSize=${pageSize}&view=${viewName}&offset=`
var delIndex = []
var statusDel = 0

//判断如果运行环境不为主 app 时执行搜词，且为 widget 时 push 延迟 2 秒
if ($app.env !== $env.app) {
  if ($app.env == $env.today) {
    var delay = 2
    search()
  } else {
    search()
  }
} else {
  flashCard()
}

// 查词，并推送通知
function search() {
  $http.request({
    method: "GET",
    url: "https://api.shanbay.com/bdc/search/?word=" + text,
    handler: function (resp) {
      var sbdata = resp.data.data;
      var def = sbdata.definition;
      var audio = [{
        "url": sbdata.audio,
      }];
      var pron = sbdata.pronunciation;
      var endefJson = sbdata.en_definitions;
      var endef = "";
      for (var key in endefJson) {
        endef += key + ":" + endefJson[key] + "\n"
      }

      $push.schedule({
        title: text,
        body: def,
        delay: delay,
        script: name,
        mute: 1,
      })
      if (apiKey !== undefined) {
        postAir(text, endef, def, pron, audio)
      }
    }
  })
}

// 发送所查单词到 Airtable
function postAir(text, endef, def, pron, audio) {
  $http.post({
    url: airUrl,
    header: {
      Authorization: "Bearer " + apiKey
    },
    body: {
      fields: {
        Word: text,
        Meaning: endef,
        中文含义: def,
        音标: pron,
        发音: audio,
      }
    },
    handler: function (resp) {
      var data = resp.data;
    }
  })
}

// 主界面
function flashCard() {
  $ui.render({
    props: {
      title: "Word List",
      navBarHidden: true,
      statusBarStyle: 0,
      id: "main",
      navButtons: [
        {
          title: "确认删除",
          icon: "027",
          handler: function () {
            delExc()
          }
        },
        {
          title: "取消删除",
          icon: "225",
          handler: function () {
            delCancel()
          }
        }
      ]
    },
    views: [{
      type: "matrix",
      props: {
        id: "wordList",
        columns: 2,
        spacing: 5,
        data: [],
        itemHeight: 88,
        template: {
          views: [
            {
              type: "view",
              views: [{
                type: "label",
                props: {
                  id: "word",
                  autoFontSize: true,
                },
                layout: function (make, view) {
                  make.top.left.equalTo($("shadow"));
                  make.height.equalTo(28)
                }
              }, {
                type: "label",
                props: {
                  id: "cnDef",
                  autoFontSize: true,
                  lines: 0,
                },
                layout: function (make, view) {
                  make.top.equalTo($("word").bottom)
                  make.bottom.equalTo($("shadow").bottom)
                  make.width.equalTo($("shadow").width)
                }
              },
              ],
              props: {
                bgcolor: $color("white"),
                id: "shadow",
              },
              layout: function (make, view) {
                make.edges.inset(0.1);
                shadowSet(view);
              }
            },
          ]
        },
        header: {  //头部设置
          type: "label",
          props: {
            height: 20,
            text: "⚙setting",
            textColor: $color("#AAAAAA"),
            align: $align.center,
            font: $font(12),
          },
          events: {
            tapped: function (sender) {
              setting()
            }
          }
        },
        footer: {  //无新数据时提示，需在initTable 跳过继续请求数据
          type: "label",
          props: {
            id: "footer",
            height: 20,
            text: "已经到底了",
            textColor: $color("#AAAAAA"),
            align: $align.center,
            font: $font(12),
            hidden: true,
          }
        }
      },
      layout: $layout.fill,
      events: {
        didReachBottom: function (sender) {
          initTable();
          sender.endFetchingMore()
        }, //触底动作
        didSelect: function (sender, indexPath, data) {
          var gitems = [] //gallery 的数据
          titems(indexPath, gitems)
          tinder(gitems, indexPath)
        },
        didLongPress: function (sender, indexPath, data) {
          addnew()
          let dataWord = data.word
          if (dataWord.text == dataWord.info.word) {
            let uDelList = $("wordList").data
            uDelList[indexPath.row].word.text = "❌" + dataWord.text;
            uDelList[indexPath.row].shadow.alpha = 0.3
            $("wordList").data = uDelList
            delIndex.push(indexPath)
          } else {
            let uDelList = $("wordList").data
            uDelList[indexPath.row].shadow.alpha = 1
            uDelList[indexPath.row].word.text = dataWord.info.word
            $("wordList").data = uDelList
            var newDelIndex = delIndex.filter(del => del !== indexPath)
            delIndex = newDelIndex
          }
        },
      },
    }],
    events: {
      appeared: function () {
        if (pgOffset == "") {
          initTable()
        }
      }
    }
  });
}
// list 初始化
function initTable() {
  listData = $("wordList").data;
  getTable();
  return pgOffset;
}
// 获取 airtable 数据
function getTable() {
  $http.get({
    url: airUrl + pgOffset,
    header: {
      Authorization: "Bearer " + apiKey,
    },
    handler: function (resp) {
      tableData = resp.data.records;
      if (tableData !== undefined) {  //判断数据源是否到底
        if (pgOffset !== resp.data.offset) {   // 避免重复提交
          pgOffset = resp.data.offset; // airtable 分页，表格格式不正确可能会导致无法获取
          pushData(tableData);
          $("wordList").data = listData;
          return pgOffset;
        }
      } else {
        $("footer").hidden = false;
      }
    }
  })
}
// 添加分页数据
function pushData() {
  for (var record of tableData) {
    var field = record.fields
    var cnDef = field.中文含义
    var myWord = field.Word
    var enDef = field.Meaning
    var pron = field.音标
    var voice = field.发音[0].url
    var recID = record.id
    var listItem = {
      shadow: {
        alpha: 1
      },
      word: {
        text: myWord,
        font: $font("AlNile-Bold", 20),
        info: {
          enDef: enDef,
          pron: pron,
          voice: voice,
          cnDef: cnDef,
          word: myWord,
          recID: recID,
        }
      },
      cnDef: {
        text: cnDef,
        font: $font(14)
      }
    };
    listData.push(listItem)
  }
};
// 边框阴影
function shadowSet(view) {
  var layer = view.runtimeValue().invoke("layer")
  layer.invoke("setShadowOffset", $size(0, 3))
  layer.invoke("setShadowColor", $color("gray").runtimeValue().invoke("CGColor"))
  layer.invoke("setShadowOpacity", 1)
  layer.invoke("setShadowRadius", 4)
  layer.invoke("setCornerRadius", 5)
}
// 设置 airtable 参数页
var setting = function () {
  $ui.push({
    props: {
      title: "设置"
    },
    views: [
      {
        type: "input",
        props: {
          id: "apiKey",
          text: apiKey,
          placeholder: "api key"
        },
        layout: function (make, view) {
          make.top.left.equalTo(view.super).inset(25)
          make.size.equalTo($size(300, 40))
        },
        events: {
          changed: function (sender) {
            var apiKey = sender.text;
            $cache.set("apiKey", apiKey);
          }
        }
      },
      {
        type: "input",
        props: {
          id: "baseName",
          text: baseName,
          placeholder: "base name"
        },
        layout: function (make, view) {
          make.top.equalTo(view.prev.bottom).inset(25),
            make.left.equalTo(view.prev.left)
          make.size.equalTo($size(300, 40))
        },
        events: {
          changed: function (sender) {
            var baseName = sender.text;
            $cache.set("baseName", baseName);
          }
        }
      },
      {
        type: "input",
        props: {
          id: "tableName",
          text: tableName,
          placeholder: "table name"
        },
        layout: function (make, view) {
          make.top.equalTo(view.prev.bottom).inset(25),
            make.left.equalTo(view.prev.left)
          make.size.equalTo($size(300, 40))
        },
        events: {
          changed: function (sender) {
            var tableName = sender.text;
            $cache.set("tableName", tableName);
          }
        }
      },
      {
        type: "input",
        props: {
          id: "viewName",
          text: viewName,
          placeholder: "view name"
        },
        layout: function (make, view) {
          make.top.equalTo(view.prev.bottom).inset(25),
            make.left.equalTo(view.prev.left)
          make.size.equalTo($size(300, 40))
        },
        events: {
          changed: function (sender) {
            var viewName = sender.text;
            $cache.set("viewName", viewName);
          }
        }
      },
      {
        type: "input",
        props: {
          id: "pageSize",
          text: pageSize,
          type: $kbType.number,
          placeholder: "page size",
        },
        layout: function (make, view) {
          make.top.equalTo(view.prev.bottom).inset(25),
            make.left.equalTo(view.prev.left)
          make.size.equalTo($size(300, 40))
        },
        events: {
          changed: function (sender) {
            var pageSize = sender.text;
            $cache.set("pageSize", pageSize);
          }
        }
      },
      {
        type: "button",
        props: {
          title: "重启脚本以更新配置",
        },
        layout: function (make, view) {
          make.top.equalTo(view.prev.bottom).inset(25),
            make.left.right.inset(15)
        },
        events: {
          tapped: function (sender) {
            $addin.restart()
          }
        }
      },
      {
        type: "button",
        props: {
          title: "查看设置方法",
        },
        layout: function (make, view) {
          make.top.equalTo(view.prev.bottom).inset(25),
            make.left.right.inset(15)
        },
        events: {
          tapped: function (sender) {
            $app.openURL("https://www.notion.so/Airtable-9bd3f31ec00041ef8fa8c09f55c99a78")
          }
        }
      }
    ]
  });
}
// 幻灯视图
function tinder(gitems, indexPath) {
  $ui.push({
    props: {
      title: "",
      //navBarHidden: true,
    },
    views: [
      {
        type: "view",
        props: {
          bgcolor: $color("white"),
        },
        layout: function (make, view) {
          make.left.right.inset(12)
          make.centerY.equalTo(view.super).offset(-50)
          make.height.equalTo(390)
          shadowSet(view);
        }
      },
      {
        type: "gallery",
        props: {
          id: "gallery",
          smoothRadius: 5,
          items: gitems,
          bgcolor: $color("tint"),
          page: page(indexPath),
        },
        layout: function (make, view) {
          make.left.right.inset(12)
          make.centerY.equalTo(view.super).offset(-50)
          make.height.equalTo(390)
          shadowSet(view)
        },
        events: {
          changed: function (sender) {
            // ❓【】首末位实现循环？似乎做不到
          }
        }
      },
      {
        type: "view",
        props: {
          bgcolor: $color("white"),
        },
        layout: function (make, view) {
          make.bottom.inset(55)
          make.left.inset(50)
          make.size.equalTo($size(80, 60))
          shadowSet(view);
        }
      }, 
      {
        type: "button",
        props: {
          title: "已记住",
          icon: $icon("073", $color("white")),
        },
        events: {
          tapped: function (sender) {
            checked()
          }
        },
        layout: function (make, view) {
          make.bottom.inset(55)
          make.left.inset(50)
          make.size.equalTo($size(80, 60))
        }
      },
      {
        type: "view",
        props: {
          bgcolor: $color("white"),
        },
        layout: function (make, view) {
          make.bottom.inset(55)
          make.right.inset(50)
          make.size.equalTo($size(80, 60))
          shadowSet(view);
        }
      }, 
      {
        type: "button",
        props: {
          title: "不认识",
          icon: $icon("016", $color("white")),
        },
        layout: function (make, view) {
          make.bottom.inset(55)
          make.right.inset(50)
          make.size.equalTo($size(80, 60))
        },
        events: {
          tapped: function (sender) {
            var itemLoc = $("gallery").page;
            var itemInfo = $("gallery").views[itemLoc].info
            var word = itemInfo.word
            var pron = itemInfo.pron
            var enDef = itemInfo.enDef
            var cnDef = itemInfo.cnDef
            // 生成卡背内容，替代卡正
            $("gallery").views[itemLoc].align = 0;
            $("gallery").views[itemLoc].text = `${word}\n /${pron}/ \n${cnDef}\n${enDef}`;
            $("gallery").views[itemLoc].font = $font("AvenirNext-BoldItalic", 18)
            $("gallery").views[itemLoc].autoFontSize = true // ❓不清楚为什么定义默认后，不可改为自动
            $delay(4, function () {  // 4秒后恢复卡正
              $("gallery").views[itemLoc].text = word;
              $("gallery").views[itemLoc].align = $align.center;
              $("gallery").views[itemLoc].font = $font("AvenirNext-BoldItalic", 35)
            })
          }
        }
      }]
  });
}
// 计算进入 gallery 页面后展示的位置。
function page(indexPath) {
  var itemPage = indexPath.item % pageSize
  return itemPage;
}
// 生成 gallery 视图的数据
function titems(indexPath, gitems) {
  var wlLength = $("wordList").data.length - 1
  var pageIndexb = Math.trunc(indexPath.item / pageSize) * pageSize; //所选项目组开始的位置
  var pbLast = Math.trunc(wlLength / pageSize) * pageSize
  if (pageIndexb == pbLast) {
    var pageIndexe = $("wordList").data.length
  } else {
    var pageIndexe = pageIndexb + (pageSize * 1)
  }

  for (i = pageIndexb; i < pageIndexe; i++) {
    var giDataRaw = $("wordList").object($indexPath(0, i))
    var wordRaw = giDataRaw.word
    var gInfo = wordRaw.info
    gInfo.index = i
    var word = wordRaw.text
    var gitem = {
      type: "label",
      props: {
        text: word,
        align: $align.center,
        font: $font("AvenirNext-BoldItalic", 35),
        info: gInfo,
        textColor: $color("white"),
        lines: 0,
      },
      events: {
        tapped: function (sender) {
          $audio.play({ url: sender.info.voice });
        }
      }
    }
    gitems.push(gitem)
  }
}
// 选择记住当前单词
function checked() {
  var itemLoc = $("gallery").page;
  var itemInfo = $("gallery").views[itemLoc].info
  var recID = itemInfo.recID
  var word = itemInfo.word
  var rUrl = `https://api.airtable.com/v0/${baseName}/${tableName}/${recID}`;
  $http.request({
    method: "PATCH",
    url: rUrl,
    header: {
      Authorization: "Bearer " + apiKey
    },
    body: {
      "fields": {
        "已记住": true,
      }
    },
    handler: function (resp) {
    }
  })
  // 在 gallery 标记 
  $("gallery").views[itemLoc].text = "✅" + word
  // 在 wordlist 标记
  var listLoc = itemInfo.index
  var wordListData = $("wordList").data
  wordListData[listLoc].word.text = "✅" + word
  $("wordList").data = wordListData
}

$app.tips("此脚本支持与 Airtable 搭配使用。\n 如需此功能，请JSBOX内打开脚本，点击顶部设置按钮自行配置。\n而后查词历史将保存到 Airtable，并可在 JSBOX 内浏览")

// 取消批量删除
function delCancel() {
  for (var delItem of delIndex) {
    let uDelList = $("wordList").data
    uDelList[delItem.row].shadow.alpha = 1
    uDelList[delItem.row].word.text = uDelList[delItem.row].word.info.word
    $("wordList").data = uDelList
  }
  delIndex = []
}

// 执行批量删除
function delExc() {
  let delRows = []
  for (var delItem of delIndex) {
    let uDelList = $("wordList").data
    uDelList[delItem.row].shadow.alpha = 1
    $("wordList").data = uDelList
    var delID = $("wordList").object(delItem).word.info.recID
    var rUrl = `https://api.airtable.com/v0/${baseName}/${tableName}/${delID}`;
    $http.request({
      method: "DELETE",
      url: rUrl,
      header: {
        Authorization: "Bearer " + apiKey
      },
      handler: function (resp) {
        console.log(resp)
      }
    })
    delRows.push(delItem.row)
  }
  var newListData = $("wordList").data.filter((noDel, noDelI) => delRows.includes(noDelI) == false)
  $("wordList").data = newListData
  delIndex = []
}

// 页面顶部添加删除和取消按钮
function addnew() {
  if (statusDel == 0) {
    statusDel = 1
    $("wordList").updateLayout(function (make) {
      make.top.equalTo($("main")).offset(60)
    })
    $("main").add({
      type: "button",
      props: {
        title: "删除",
        align: $align.center,
        bgcolor: $color("red"),
        icon: $icon("027", $color("white")),
        id: "btnDel"
      },
      layout: function (make, view) {
        make.bottom.equalTo($("wordList").top)
        make.top.equalTo(view.super).inset(20)
        make.left.equalTo(view.super).inset(40)
        make.size.equalTo($size(100, 40))
      },
      events: {
        tapped: function (sender) {
          delExc()
          $("btnDel").remove()
          $("btnCancel").remove()
          $("wordList").updateLayout($layout.fill)
          statusDel = 0
        }
      }
    });
    $("main").add({
      type: "button",
      props: {
        title: "取消",
        align: $align.center,
        icon: $icon("225", $color("white")),
        id: "btnCancel"
      },
      layout: function (make, view) {
        make.bottom.equalTo($("wordList").top)
        make.top.equalTo(view.super).inset(20)
        make.right.equalTo(view.super.right).inset(40)
        make.size.equalTo($size(100, 40))
      },
      events: {
        tapped: function (sender) {
          delCancel()
          $("btnDel").remove()
          $("btnCancel").remove()
          $("wordList").updateLayout($layout.fill)
          statusDel = 0
        }
      }
    })
  }
}
