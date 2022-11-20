var l, arr = [];
db.posts.find({'attachments.link.url':{$exists:true}}, {'attachments':1}).limit(1000).sort({createdAt:-1}).forEach(function(p) {
    l = p.attachments.link;
    if (l.short) delete l.short.aid;
    arr.push(l);
});
printjson(arr);