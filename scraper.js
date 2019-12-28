const https = require("https");
const fs = require("fs");
const url = require("url");
const path = require("path");
const cheerio = require("cheerio");

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

function download_url(url) {
	const start_time = process.hrtime();
	const pathname_split = url.pathname.split("/");
	pathname_split.shift();
	const filename = pathname_split.pop();
	const directory_path = pathname_split.join("/");
	fs.mkdir(directory_path, { recursive: true }, err => {
		if (err) throw err;
		const file = fs.createWriteStream(path.join(directory_path, filename));
		const request = https.get(url, response => {
			response.pipe(file);
			// The whole response has been received. Print out the result.
			response.on("end", () => {
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
			});
		});
	});
}

function download_urls(urls) {
	const start_time = process.hrtime();
	urls.forEach(url => download_url(new URL(url)));
	const end_time = process.hrtime(start_time);
	console.log(
		"Downloaded urls in " + format_time(end_time[0]) + " %ds %dms",
		end_time[0],
		end_time[1] / 1000000
	);
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
	// const links_filename = html_url.pathname.split("/").slice(-1)[0] + ".links";
	const download_urls = extract_textarea_contents($).split("\n");
	const end_time = process.hrtime(start_time);
	console.log(
		"Parsed html in " + format_time(end_time[0]) + " %ds %dms",
		end_time[0],
		end_time[1] / 1000000
	);
	return download_urls;
	// fs.writeFile(links_filename, extract_textarea_contents($), function(err) {
	// 	if (err) return console.log(err);
	// 	console.log("The file was saved to " + links_filename);
	// });
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
					"Downloaded html in " + format_time(end_time[0]) + " %ds %dms",
					end_time[0],
					end_time[1] / 1000000
				);
				download_urls(parse_html(html_url, data));
			});
		})
		.on("error", err => {
			console.error("Error: " + err.message);
		});
}

fetch_html(new URL(process.argv[2]));
