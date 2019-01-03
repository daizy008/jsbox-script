const DeviceSIZE = $device.info.screen

$ui.render({
  props: {
    title: "计数器",
    navButtons:[
      {
      title: "addNew",
      handler: function(){
        var itemIndex = $("list").data.length;
        $("list").insert({
          index: $indexPath(itemIndex),
          value: {
            label: {
              info: {
                indexPath: itemIndex,
              }
             },
             input: {
               info: {
                indexPath: itemIndex,
               }
             },
             stepper: {
               info: {
                indexPath: itemIndex,
               }
             },
          }
        });
      }
      }
    ]
  },
  views: [
    {
      type: "list",
      props: {
        id: "list",
        template: [
          {
            type: "view",
            props: {
              id: "itemView",
              bgcolor: $rgba(177, 159, 132, 0.1),
              radius: 5
            },
            layout: function (make, view) {
              make.left.right.inset(10)
              make.top.inset(5)
              make.width.equalTo(DeviceSIZE.width - 40)
              make.height.equalTo(40)
            }
          },
          {
            type: "input",
            props:{
              id: "input",
            },
            events:{
              returned: function(sender){
                var listData = $("list").data;
                var myIndex = $("list").data.length - sender.info.indexPath - 1;
                listData[myIndex].input.text = sender.text;
                $("list").data = listData;
                sender.blur();
                $cache.set("listData", listData);
              }
            },
            layout: function(make,view){
              make.left.equalTo($("itemView"))
              make.size.equalTo($size(170,40))
              make.top.equalTo(view.supper).offset(5)
            }
          },
          {
            type: "label",
            props:{
              align: $align.center,
              id: "label",
            },
            layout: function(make,view){
              make.size.equalTo($size(50,40))
              make.left.equalTo($("input").right).offset(20)
              make.top.equalTo(view.supper).offset(5)
            },
          },
          {
            type: "stepper",
            props:{
              max: 10000,
              value: 0,
              id: "stepper",
            },
            layout: function(make,view){
              make.size.equalTo($size(110,40))
              make.right.equalTo($("itemView").right).offset(10)
              make.centerY.equalTo($("itemView")).offset(5)
            },
            events: {
              changed: function(sender){
                var listData = $("list").data;
                //sender.prev.text = sender.value; 通过 prev 获取前一个 view
                var myIndex = $("list").data.length - sender.info.indexPath - 1; //向数组添加新值时，是从列表头部添加，所以取值时要倒序
                listData[myIndex].label.text = JSON.stringify(sender.value);
                listData[myIndex].stepper.value = sender.value;
                $("list").data = listData;
                $cache.set("listData", listData);
              }
            }            
          }
        ],
      },
      layout:  $layout.fill,
      events:{
        ready: function(sender){
          $("list").data = $cache.get("listData");
        }     
    }
  }
  ],
});
