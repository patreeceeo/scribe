
FileManager.addInitializer(function(){

    var blob1 = new Blob([image1_data], { type: 'image/jpeg' });
    var blob2 = new Blob([text1_data], { type: 'plain/text' });
    console.log('url', URL.createObjectURL(blob1));
    var files = new FileManager.Files([
        { 
            name: 'file1'
            , data: 'data:image/jpeg;base64,'+image1_data
            , file: blob1
        }
        , {
            name: "file2"
            , data: text1_data
            , file: blob2
        }
    ]);

    var layout = new FileManager.Layout({
        files: files
    });

    FileManager.main_region.show(layout);
});

