var statusDel = 0
var delIndex = []

$ui.render({
    props: {
        id: "main",
        title: "Hello, World!"
    },
    views: [
        {
            type: "list",
            props: {
                data: ["JavaScript", "Swift", "JavaScript", "Swift", "JavaScript", "Swift", "JavaScript", "Swift", "JavaScript", "Swift", "JavaScript", "Swift", "JavaScript", "Swift", "JavaScript", "Swift"],
                id: "list"
            },
            layout: $layout.fill,
            events: {
                didSelect: function (sender, indexPath, data) {
                    addnew()
                    var delObj = $("list").cell(indexPath)
                    if (delObj.alpha == 1) {
                        delObj.alpha = 0.3
                        delIndex.push(indexPath)
                    } else {
                        delObj.alpha = 1
                        var newDelIndex = delIndex.filter(del => del !== indexPath)
                        delIndex = newDelIndex
                    }
                    console.log(delIndex)

                }
            }
        }

    ]
})

// 加入顶部删除菜单
function addnew() {
    $("list").updateLayout(function (make) {
        make.top.equalTo($("main")).offset(40)
    })
    $("main").add({
        type: "button",
        props: {
            title: "删除",
            align: $align.center,
            id: "btnDel"
        },
        layout: function (make, view) {
            make.bottom.equalTo($("list").top)
            make.top.equalTo(view.super)
            make.left.equalTo(view.super).inset(40)
            make.size.equalTo($size(100, 40))
        },
        events: {
            tapped: function (sender) {
                delExc()
                $("btnDel").remove()
                $("btnCancel").remove()
                $("list").updateLayout($layout.fill)
                statusDel = 0
            }
        }
    });
    $("main").add({
        type: "button",
        props: {
            title: "取消",
            align: $align.center,
            id: "btnCancel"
        },
        layout: function (make, view) {
            make.bottom.equalTo($("list").top)
            make.top.equalTo(view.super)
            make.right.equalTo(view.super.right).inset(40)
            make.size.equalTo($size(100, 40))
        },
        events: {
            tapped: function (sender) {
                delCancel()
                $("btnDel").remove()
                $("btnCancel").remove()
                $("list").updateLayout($layout.fill)
                statusDel = 0
            }
        }
    })
}

// 取消删除
function delCancel() {
    for (var delItem of delIndex) {
        console.log(delItem)
        $("list").cell(delItem).alpha = 1
    }
    delIndex = []
}

// 执行批量删除
function delExc() {
    let delRows = []
    for (var delItem of delIndex) {
        $("list").cell(delItem).alpha = 1
        delRows.push(delItem.row)
    }
    var newListData = $("list").data.filter((noDel, noDelI) => delRows.includes(noDelI) == false)
    $("list").data = newListData
    delIndex = []
}
