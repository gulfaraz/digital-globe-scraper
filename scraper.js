const https = require("https");
const fs = require("fs");
const url = require("url");
const path = require("path");
const cheerio = require("cheerio");
const request = require("request");
const async = require("async");
const ProgressBar = require("progress");

ST_MAARTEN_PRODUCT_IDS = [
    "10200100620FDC00",
    "102001006814C300",
    "102001006886C000",
    "1030010070D20000",
    "1030010071391E00",
    "10300100721C9600",
    "103001007291A200",
    "1040010031199800",
    "1040010032697D00",
    "1040010032ACA100",
    "105001000BCBA800",
    "103001005B6AEB00",
    "103001006B055400",
    "103001003DD5FC00",
    "1050410010375B00",
];

class Downloader {
    constructor() {
        this.q = async.queue(this.download_url, 1);

        // assign a callback
        this.q.drain(function() {
            console.log("all items have been processed");
        });

        // assign an error callback
        this.q.error(function(err, task) {
            console.error("task experienced an error", task);
        });
    }

    download_urls(urls) {
        const start_time = process.hrtime();
        urls.forEach(url => this.q.push(new URL(url)));
        const end_time = process.hrtime(start_time);
        console.log(
            "Downloaded urls in " + format_time(end_time[0]) + " %ds %dms",
            end_time[0],
            end_time[1] / 1000000
        );
    }

    download_url(url, cb) {
        const start_time = process.hrtime();
        const pathname_split = url.pathname.split("/");
        pathname_split.shift();
        const product_id = pathname_split[3];
        const filename = pathname_split.pop();
        const directory_path = pathname_split.join("/");
        const file_path = path.join(directory_path, filename);
        if (ST_MAARTEN_PRODUCT_IDS.indexOf(product_id) >= 0) {
            fs.access(file_path, fs.constants.F_OK, err => {
                if (err) {
                    console.info("File " + file_path + " does not exist.");
                    fs.mkdir(directory_path, { recursive: true }, err => {
                        if (err) throw err;
                        const output_file = fs.createWriteStream(file_path);
                        let file = request(url.href);
                        let bar;
                        file.on("response", res => {
                            const len = parseInt(
                                res.headers["content-length"],
                                10
                            );
                            console.log();
                            bar = new ProgressBar(
                                "  Downloading [:url] [:bar] :rate/bps :percent :etas",
                                {
                                    url: url.href,
                                    complete: "=",
                                    incomplete: " ",
                                    width: 20,
                                    total: len,
                                }
                            );
                            file.on("data", chunk => {
                                bar.tick(chunk.length);
                            });
                            file.on("end", () => {
                                const end_time = process.hrtime(start_time);
                                console.log(
                                    "Downloaded url (" +
                                        url +
                                        ") in " +
                                        format_time(end_time[0]) +
                                        " %ds %dms",
                                    end_time[0],
                                    end_time[1] / 1000000
                                );
                                console.log("\n");
                                cb();
                            });
                        });
                        file.pipe(output_file);
                    });
                } else {
                    console.info("File " + file_path + " already exists.");
                    cb();
                }
            });
        } else {
            fs.access(directory_path, fs.constants.F_OK, err => {
                if (err) {
                    console.log(
                        "directory " + directory_path + " does not exist"
                    );
                    cb();
                } else {
                    fs.rmdir(directory_path, { recursive: true }, err => {
                        console.log(
                            "deleted " + directory_path + " and its contents"
                        );
                        cb();
                    });
                }
            });
        }
    }
}

function format_time(time) {
    // Hours, minutes and seconds
    var hrs = ~~(time / 3600);
    var mins = ~~((time % 3600) / 60);
    var secs = ~~time % 60;

    // Output like "1:01" or "4:03:59" or "123:03:59"
    var ret = "";

    if (hrs > 0) {
        ret += "" + hrs + ":" + (mins < 10 ? "0" : "");
    }

    ret += "" + mins + ":" + (secs < 10 ? "0" : "");
    ret += "" + secs;
    return ret;
}

function extract_textarea_contents($) {
    const start_time = process.hrtime();
    let contents = [];

    $("textarea").each(function(i) {
        contents[i] = $(this)
            .text()
            .trim();
    });

    contents = contents.join("\n");

    const end_time = process.hrtime(start_time);
    console.log(
        "Extracted links in " + format_time(end_time[0]) + " %ds %dms",
        end_time[0],
        end_time[1] / 1000000
    );

    return contents;
}

function parse_html(html_url, html_string) {
    const start_time = process.hrtime();
    const $ = cheerio.load(html_string);
    const download_urls = extract_textarea_contents($).split("\n");
    const end_time = process.hrtime(start_time);
    console.log(
        "Parsed html in " + format_time(end_time[0]) + " %ds %dms",
        end_time[0],
        end_time[1] / 1000000
    );
    return download_urls;
}

function fetch_html(html_url) {
    const start_time = process.hrtime();
    console.info("Fetching html from URL: " + html_url);
    https
        .get(html_url, resp => {
            let data = "";

            // A chunk of data has been received.
            resp.on("data", chunk => {
                data += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on("end", () => {
                const end_time = process.hrtime(start_time);
                console.log(
                    "Downloaded html in " +
                        format_time(end_time[0]) +
                        " %ds %dms",
                    end_time[0],
                    end_time[1] / 1000000
                );
                const dl = new Downloader();
                dl.download_urls(parse_html(html_url, data));
            });
        })
        .on("error", err => {
            console.error("Error: " + err.message);
        });
}

fetch_html(new URL(process.argv[2]));
