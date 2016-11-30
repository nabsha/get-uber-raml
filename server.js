var express    = require('express'),
    fileUpload = require('express-fileupload'),
    app        = express(),
    fs = require('fs')
    unzip = require('unzip'),
        glob = require('glob');

var raml = require('raml-parser');
var toRAML = require('raml-object-to-raml');
var rmdir = require('rmdir');

app.use('/form', express.static(__dirname + '/upload.test.html'));

app.set('port', (process.env.PORT || 5000));

// default options
app.use(fileUpload());

app.get('/ping', function(req, res) {
    res.send('pong');
});

app.post('/upload', function(req, res) {
    var sampleFile, uploadPath;

    if (!req.files) {
        res.status(400).send('No files were uploaded.');
        return;
    }

    sampleFile = req.files.sampleFile;

    uploadPath = '/tmp/' + sampleFile.name + new Date().getTime();

    sampleFile.mv(uploadPath, function(err) {
        if (err) {
            res.status(500).send(err);
        }
    });

    // extract files
    var unzipDirectory = uploadPath + ".d";
    var unzipExtractor = unzip.Extract({ path: unzipDirectory });
    unzipExtractor.on('close', function() {
        console.log("Extraction complete " + unzipDirectory)
            glob(unzipDirectory + "/*.raml", function (er, files) {
                console.log(files)
                if (!er) {
                    files.forEach( function(file) {
                        raml.loadFile(file).then( function(data) {
                            res.contentType('application/json').send(toRAML(data))
                            fs.unlink(uploadPath, function (err) {
                                if (err) throw err;
                            console.log('successfully deleted ' + uploadPath);
                        });

                            rmdir(unzipDirectory, function (err, dirs, files) {
                                console.log(dirs);
                                console.log(files);
                                console.log('all files are removed');
                            });
                        }, function(error) {
                            console.log('Error parsing: ' + error);
                        });
                    }
                    )
                }
            })
    });

    fs.createReadStream(uploadPath).pipe(unzipExtractor);
})

app.use(express.static('./public')); 		// set the static files location /public/img will be /img for users

app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
})