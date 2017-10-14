var express = require('express');
var fileUpload = require('express-fileupload');
var fs = require('fs');
var unzip = require('unzip');
var glob = require('glob');

var raml1 = require('raml-1-parser');
var toRAML = require('raml-object-to-raml');
var rmdir = require('rmdir');

var app = express();

app.set('port', (process.env.PORT || 5000));


app.use(fileUpload());

app.get('/ping', function (req, res) {
    res.send('pong');
});

function uberGenerator(file, res, uploadPath, unzipDirectory) {
      raml1.loadApi(file).then(function (data) {
        res.contentType('application/json').send(toRAML(data.toJSON()))
        fs.unlink(uploadPath, function (err) {
            if (err) throw err;
            console.log('successfully deleted ' + uploadPath);
        });

        rmdir(unzipDirectory, function (err, dirs, files) {
            console.log('all files are removed');
        });
    }, function (error) {
        console.log('Error parsing: ' + error);
    });
}

function successfulUnzip(unzipDirectory, res, uploadPath) {
    console.log("Extraction complete " + unzipDirectory)
    glob(unzipDirectory + "/*.raml", function (err, files) {
        console.log(files)
        if (!err) {
            files.forEach(function (file) {
                    uberGenerator(file, res, uploadPath, unzipDirectory);
                }
            )
        } else {
            res.status(400).send("No raml file found in the zipped file" + err)
        }
    })
}


app.post('/upload', function (req, res) {
    var sampleFile, uploadPath;

    if (!req.files) {
        res.status(400).send('No files were uploaded.');
        return;
    }

    sampleFile = req.files.sampleFile;

    uploadPath = '/tmp/' + sampleFile.name + new Date().getTime();

    sampleFile.mv(uploadPath, function (err) {
        if (err) {
            res.status(500).send(err);
        }
    });

    // extract files

    var unzipDirectory = uploadPath + ".d";
    var unzipExtractor = unzip.Extract({
        path: unzipDirectory
    });

    unzipExtractor.on('error', function (err) {
        if (err) {
            res.status(400).send("Failed to unzip file, bad input file" + err)
        }
    });

    unzipExtractor.on('close', function () {
        successfulUnzip(unzipDirectory, res, uploadPath);
    });

    fs.createReadStream(uploadPath).pipe(unzipExtractor);
})

app.use(express.static('./public')); 		// set the static files location /public/img will be /img for users

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
})