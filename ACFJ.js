const version = 1.52
var pgOffset = "";
var apiKey = $cache.get("apiKey")
var tableName = $cache.get("tableName")
var viewName = $cache.get("viewName")
var pageSize = $cache.get("pageSize")
var baseName = $cache.get("baseName")
var airUrl = `https://api.airtable.com/v0/${baseName}/${tableName}?pageSize=${pageSize}&view=${viewName}&offset=`
var delIndex = [] //待删除对象的索引
var statusDel = 0  //是否处于删除界面
var homeRecs = $cache.get("homeRecs") || []
var fcFrontRecs = $cache.get("fcFrontRecs") || []
var fcBackRecs = $cache.get("fcBackRecs") || []
var fcVoice = $cache.get("fcVoice") || []
$app.keyboardToolbarEnabled = true
$app.autoKeyboardEnabled = true

// 主界面
$ui.render({
    props: {
        title: "Word List",
        navBarHidden: true,
        statusBarStyle: 0,
        id: "main",
    },
    views: [{
        type: "matrix",
        props: {
            id: "wordList",
            columns: 2,
            spacing: 5,
            data: [],
            itemHeight: 88,
            //【】waterfall: true, 需要设置 item 动态大小
            template: {
                views: [
                    {
                        type: "view",
                        views: [{
                            type: "label",
                            props: {
                                id: "h1",
                                font: $font("AlNile-Bold", 20), //【】字体大小有待调整
                            },
                            layout: function (make, view) {
                                make.top.left.equalTo($("shadow"));
                                make.height.equalTo(28)
                            }
                        }, {
                            type: "label",
                            props: {
                                id: "h2",
                                autoFontSize: true,
                                lines: 0,
                            },
                            layout: function (make, view) {
                                make.top.equalTo($("h1").bottom)
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
                let dataH1 = data.h1
                if (dataH1.text == dataH1.info[homeRecs[0]]) {
                    let uDelList = $("wordList").data
                    uDelList[indexPath.row].h1.text = "❌" + dataH1.info[homeRecs[0]];
                    uDelList[indexPath.row].shadow.alpha = 0.3
                    $("wordList").data = uDelList
                    delIndex.push(indexPath)
                } else {
                    let uDelList = $("wordList").data
                    uDelList[indexPath.row].shadow.alpha = 1
                    uDelList[indexPath.row].h1.text = dataH1.info[homeRecs[0]]
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
})

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
        let field = record.fields
        let recID = record.id
        field.recID = recID
        let h1 = homeRecs[0]
        let h2 = homeRecs[1]
        let listItem = {
            shadow: {
                alpha: 1
            },
            h1: {
                text: field[h1],
                info: field
            },
            h2: {
                text: field[h2],
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
                    returned: function (sender) {
                        var apiKey = sender.text;
                        $cache.set("apiKey", apiKey);
                        $("apiKey").blur()
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
                    returned: function (sender) {
                        var baseName = sender.text;
                        $cache.set("baseName", baseName);
                        $("baseName").blur()
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
                    returned: function (sender) {
                        var tableName = sender.text;
                        $cache.set("tableName", tableName);
                        $("tableName").blur()
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
                    returned: function (sender) {
                        var viewName = sender.text;
                        $cache.set("viewName", viewName);
                        $("viewName").blur()
                    }
                }
            },
            {
                type: "input",
                props: {
                    id: "pageSize",
                    text: pageSize,
                    type: 2,
                    placeholder: "page size",
                },
                layout: function (make, view) {
                    make.top.equalTo(view.prev.bottom).inset(25),
                        make.left.equalTo(view.prev.left)
                    make.size.equalTo($size(300, 40))
                },
                events: {
                    returned: function (sender) {
                        var pageSize = sender.text;
                        $cache.set("pageSize", pageSize);
                        $("pageSize").blur()
                    }
                }
            },
            {
                type: "button",
                props: {
                    title: "测试此配置",
                },
                layout: function (make, view) {
                    make.top.equalTo(view.prev.bottom).inset(25),
                        make.left.right.inset(15)
                },
                events: {
                    tapped: function (sender) {
                        recSetting()
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
                        let itemLoc = $("gallery").page;
                        let itemInfo = $("gallery").views[itemLoc].info
                        let h1 = itemInfo[fcBackRecs[0]] || ""
                        let h2 = itemInfo[fcBackRecs[1]] || ""
                        let h3 = itemInfo[fcBackRecs[2]] || ""
                        let h4 = itemInfo[fcBackRecs[3]] || ""
                        // 生成卡背内容，替代卡正
                        $("gallery").views[itemLoc].align = 0;
                        $("gallery").views[itemLoc].text = `${h1}\n ${h2} \n${h3}\n${h4}`;
                        $("gallery").views[itemLoc].font = $font("AvenirNext-BoldItalic", 18)
                        $delay(4, function () {  // 4秒后恢复卡正
                            $("gallery").views[itemLoc].text = itemInfo.gFront;
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
        let giDataRaw = $("wordList").object($indexPath(0, i)) //matrix 位置上的 data
        let h1 = fcFrontRecs[0]
        let h2 = fcFrontRecs[1]
        let gInfo = giDataRaw.h1.info
        if(gInfo[h2]){
            var gFront = gInfo[h1] + "\n" + gInfo[h2]      
        } else {
        var gFront = gInfo[h1];
        };
        gInfo.gFront = gFront
        gInfo.index = i
        let fieldVoice = gInfo[fcVoice]
        var gitem = {
            type: "label",
            props: {
                text: gFront,
                align: $align.center,
                font: $font("AvenirNext-BoldItalic", 35),
                info: gInfo,
                textColor: $color("white"),
                lines: 0,
            },
            events: {
                tapped: function (sender) {
                    $audio.play({ url: fieldVoice[0].url });
                }
            }
        }
        gitems.push(gitem)
    }
}
// 选择记住当前单词
function checked() {
    let itemLoc = $("gallery").page;
    let itemInfo = $("gallery").views[itemLoc].info
    let recID = itemInfo.recID
    let frontChecked = itemInfo.gFront
    let rUrl = `https://api.airtable.com/v0/${baseName}/${tableName}/${recID}`;
    $http.request({
        method: "PATCH",
        url: rUrl,
        header: {
            Authorization: "Bearer " + apiKey
        },
        body: {
            "fields": {
                "已记住": true,  //❗️需确保 table 里有此字段
            }
        },
        handler: function (resp) {
        }
    })
    // 在 gallery 标记 
    $("gallery").views[itemLoc].text = "✅" + frontChecked
    // 在 wordlist 标记
    var listLoc = itemInfo.index
    var wordListData = $("wordList").data
    wordListData[listLoc].h1.text = "✅" + wordListData[listLoc].h1.text
    $("wordList").data = wordListData
}

$app.tips("此脚本需与 Airtable 搭配使用。\n请在 JSBOX内打开脚本，点击顶部设置按钮自行配置 Airtable 参数。\n完成后，再点击“测试此配置”，配置各页面字段")

// 取消批量删除
function delCancel() {
    for (var delItem of delIndex) {
        let uDelList = $("wordList").data
        uDelList[delItem.row].shadow.alpha = 1
        uDelList[delItem.row].h1.text = uDelList[delItem.row].h1.info[homeRecs[0]]
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
        var delID = $("wordList").object(delItem).h1.info.recID
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

// record 设置页面
function recSetting() {
    $ui.push({
        props: {
            title: "",
            id: "recSetting",
        },
        views: [
            {
                type: "button",
                props: {
                    title: "重启脚本以更新配置",
                    bgcolor: $color("red"),
                    id: "restart",
                },
                layout: function (make, view) {
                    make.top.equalTo(view.super).inset(25)
                    make.size.equalTo($size(300, 40))
                    make.centerX.equalTo(view.super)
                },
                events: {
                    tapped: function (sender) {
                        $addin.restart() //需要手动重启才有可能生效，原因未知
                    }
                }
            },
            {
                type: "markdown",
                props: {
                    content: "点击各项，选择各页面要展示的字段。选“空”则不显示。\n使用抽认卡时，table 里需含有一个名为“已记住”的 checkbox 字段",
                    scrollEnabled: false
                },
                layout: function (make, view) {
                    make.top.equalTo(view.prev.bottom).inset(5),
                    make.left.right.inset(10)
                    make.height.equalTo(120)
                }
            },
            {
                type: "button",
                props: {
                    title: "🏠首页设置",
                    id: "homeSetting",
                    type: 1,
                },
                layout: function (make, view) {
                    make.top.equalTo(view.prev.bottom).inset(20),
                    make.left.equalTo($("restart").left)
                    make.size.equalTo($size(300, 30))
                },
                events: {
                    tapped: function (sender) {
                        $picker.data({
                            props: {
                                items: pickerItem(2),
                                data: homeRecs 
                            },
                            handler: function (data) {
                                $cache.set("homeRecs", data);
                            }
                        });
                    }
                }
            },
            {
                type: "button",
                props: {
                    title: "💳抽认卡正面设置",
                    id: "fcFrontSetting",
                    type: 1,
                },
                layout: function (make, view) {
                    make.top.equalTo(view.prev.bottom).inset(25)
                    make.left.equalTo(view.prev.left)
                    make.size.equalTo($size(300, 30))
                },
                events: {
                    tapped: function (sender) {
                        $picker.data({
                            props: {
                                items: pickerItem(2)
                            },
                            handler: function (data) {
                                $cache.set("fcFrontRecs", data);
                            }
                        });
                    }
                }
            },
            {
                type: "button",
                props: {
                    title: "💳抽认卡背面设置",
                    id: "fcBackSetting",
                    type: 1,
                },
                layout: function (make, view) {
                    make.top.equalTo(view.prev.bottom).inset(25)
                    make.left.equalTo(view.prev.left)
                    make.size.equalTo($size(300, 30))
                },
                events: {
                    tapped: function (sender) {
                        $picker.data({
                            props: {
                                items: pickerItem(4)
                            },
                            handler: function (data) {
                                $cache.set("fcBackRecs", data);
                            }
                        });
                    }
                }
            },
            {
                type: "button",
                props: {
                    title: "💳发音设置(需选带音频字段)",
                    id: "fcVoice",
                    type: 1,
                },
                layout: function (make, view) {
                    make.top.equalTo(view.prev.bottom).inset(25)
                    make.left.equalTo(view.prev.left)
                    make.size.equalTo($size(300, 30))
                },
                events: {
                    tapped: function (sender) {
                        $picker.data({
                            props: {
                                items: pickerItem(1)
                            },
                            handler: function (data) {
                                $cache.set("fcVoice", data);
                            }
                        });
                    }
                }
            },
        ],
        events: {
            appeared: function (sender) {
                if (arrayF.length == 0) { getF() }
            }
        }

    });
}

var respF = await $http.get({
    url: airUrl + pgOffset,
    header: {
        Authorization: "Bearer " + apiKey,
    }
});
var arrayF = [] // airtable records 名称初始化
// 获取 records 名组成的数组，准备填充到 recSetting 的选择器里
function getF() {
    var fields = respF.data.records[0].fields
    for (var fieldName in fields) {
        arrayF.push(fieldName)
    }
    arrayF.unshift("空")
}

function pickerItem(num) {
    var pItems = []
    for (i = 0; i < num; i++) {
        pItems.push(arrayF)
    }
    return pItems
}
