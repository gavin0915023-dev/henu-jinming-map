// Camera positions are approximate local metres. Bearings are clockwise from north.
const uni='https://ganbu.henu.edu.cn/info/1036/4225.htm';
function baidu(id,x,y,bearing,pitch){
  return 'https://map.baidu.com/@'+x+','+y+',21z#panoid='+id+'&panotype=street&heading='+bearing+'&pitch='+pitch+'&l=21&tn=B_NORMAL_MAP&sc=0&newmap=1&shareurl=1&pid='+id;
}
export const fieldViews=[
  {id:'boxiang',title:'伯襄路 · 林荫道',caption:'沿路向东看：两侧是刷白的树干和贴着路缘的低绿篱。',camera:[-287,24,81.85,0],source:'百度街景',url:'https://map.baidu.com/@12725365.899999999,4115179.56,21z,87t,-81.85h#panoid=01027700001404011242060655G&panotype=street&heading=81.85&pitch=0&l=21&tn=B_NORMAL_MAP&sc=0&newmap=1&shareurl=1&pid=01027700001404011242060655G'},
  {id:'cs-entry',place:'cs',title:'计算机学院 · 文甫路入口',caption:'从东南看南翼东端。竖排院名下是玻璃门厅，右手边是转角敞廊。',camera:[12.4,-178.5,313,10],source:'百度街景',url:baidu('01027700001404011205235975G',12725730,4115427,313,10)},
  {id:'cs-south',place:'cs',title:'计算机学院 · 南翼中段',caption:'低层的窗墙退在柱后，上层宽窗下有浅色设备格栅。',camera:[-28.7,-178.2,0,10],source:'百度街景',url:baidu('01027700001404011205135615G',12725680,4115426,0,10)},
  {id:'cs-northwest',place:'cs',title:'计算机学院 · 雪垠路侧',caption:'斜向长立面上是连续的玻璃和格栅，底层保留较多实墙。',camera:[-66.6,-237.1,130,10],source:'百度街景',url:baidu('01027700001404011224035415G',12725634,4115497,130,10)},
  {id:'autumn-bank',place:'autumn',title:'访秋湖 · 北侧路缘',caption:'实景从路上朝湖看：近处是树列与低篱，远处树丛遮住水面。',camera:[63,23,154,1],source:'百度街景',url:baidu('01027700001404011243330335G',12725792.37,4115183.62,154,1)},
  {id:'jiuzhang',place:'lake',title:'九章路 · 粹庭湖桥',caption:'从桥边向东北看，浅灰色镂空石栏和间隔的方柱勾出桥面边缘。',camera:[113.6,-229.4,38,0],source:'百度街景',url:baidu('01027700001404011226315395G',12725853.26,4115490.24,38,0)},
  {id:'west-gate',place:'west',title:'西大门 · 校名墙',caption:'面向校园中轴。金明西门是低矮的校名石墙，两侧留出通道。',camera:[-485,-76,90,0],source:'校方照片',url:uni}
];

export function mountFieldViews(dialog,visit){
  const list=dialog.querySelector('.field-list');
  for(const item of fieldViews){
    const row=document.createElement('section'),title=document.createElement('h3'),note=document.createElement('p');
    title.textContent=item.title;note.textContent=item.caption;
    const go=document.createElement('button'),source=document.createElement('a');
    go.type='button';go.dataset.view=item.id;go.textContent='到这里看模型';
    go.onclick=()=>{dialog.close();visit(item);};
    source.textContent=item.source+' ↗';source.href=item.url;source.target='_blank';source.rel='noopener';
    row.append(title,note,go,source);list.append(row);
  }
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  return (place,id)=>{
    dialog.showModal();
    const index=fieldViews.findIndex(v=>id?v.id===id:place&&v.place===place);
    for(const [i,row] of [...list.children].entries())row.toggleAttribute('data-current',i===index);
    list.scrollTop=0;
    if(index>=0)list.children[index].scrollIntoView({block:'start'});
  };
}
