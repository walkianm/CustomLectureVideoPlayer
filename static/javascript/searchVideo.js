const script_url = "https://uva-video-analytics.herokuapp.com/api/script";

var dict = {};
var docs = [];
var dictSize = 0;
var lastSearch = "";
var mostSimilarDocs = [];
var currentSearchResultIndex = 0;
var matches = 0;

const NUM_RESULTS = 10;
const TIME_STEP = 5;

function searchVideo() {
    var date = new Date();
    var time = date.getTime();
    var query = $("#query").serializeArray()[0].value;

    if (query == lastSearch) {
        currentSearchResultIndex++;
        if (currentSearchResultIndex >= matches) {
            currentSearchResultIndex = 0;
        }
    } else {
        lastSearch = query;
        currentSearchResultIndex = 0;
        mostSimilarDocs = rankDocs(query);
        setSearchResults(mostSimilarDocs);
    }
    if (matches > 0) {
        setVidTime(TIME_STEP * mostSimilarDocs[currentSearchResultIndex]);
    } else {
        $(".search-results-list").empty();
        $(".search-results-list").append("<li>No Matches Found</li>");
    }

    logSearch(query, time);
}

function logSearch(query, time) {
    var vid = $("video")[0]; // sloppy, but assume the first video is our target
    input = {
        "event": "search",
        "time": time,
        "vidTime": vid.currentTime,
        "volume": vid.volume,
        "playbackRate": vid.playbackRate,
        "paused": vid.paused,
        "query": query // remove this line to disable query content logging
    };
    sendEventData(input, vid.src);
}

function setVidTime(time) {
    $("video")[0].currentTime = time;
}

function logAndChangeTime(time) {
    setVidTime(time);
    var vid = $("video")[0]; // sloppy, but assume the first video is our target
    input = {
        "event": "clickedSearchResult",
        "time": time,
        "vidTime": vid.currentTime,
        "volume": vid.volume,
        "playbackRate": vid.playbackRate,
        "paused": vid.paused
    };
    sendEventData(input, vid.src);
}

function setSearchResults(results) {
    $(".search-results-list").empty();
    var time;

    // Sorted by time, NOT relevance
    results = results.sort(function(a, b) {
        return a - b;
    });

    for (result in results) {
        time = results[result] * TIME_STEP;
        $(".search-results-list").append("<li><button onclick=\"logAndChangeTime(" + time + ");\" type=\"button\" class=\"search-result\">" + timeFormatting(time) + "</button></li>");
    }
}

function twoPlaces(amount) {
    if (amount < 10) {
        return "0" + amount;
    }
    return amount;
}

function timeFormatting(time) {
    var ret = "";
    if ($("video")[0].duration > 60 * 60) {
        ret = Math.floor(time / 3600) + ":";
    }
    return ret + twoPlaces(Math.floor((time / 60) % 60)) + ":" + twoPlaces(Math.floor(time % 60));
}

function getScript(video) {
    console.log("Getting script.");
    script = $(video).children(".script")[0].textContent;
    parseScript(clean(script));
}

function clean(script) {
    script = script.replace(/\./g, "");
    script = script.replace(/,/g, "");
    script = script.replace(/'/g, "");
    script = script.replace(/"/g, "");
    script = script.toLowerCase();
    return script;
}

function parseScript(script) {
    lines = script.split("\n");

    var line;
    var lineText;
    var word;
    var index = 0;
    for (line in lines) {
        lineText = lines[line].split(" ");
        for (word in lineText) {
            if (dict[lineText[word]] == null) {
                dict[lineText[word]] = index;
                index++;
            }
        }
    }
    dictSize = index;
    console.log(dict);


    for (line in lines) {
        var words = Array(dictSize).fill(0);
        lineText = lines[line].split(" ");
        var iterator = lineText.length;
        for (word in lineText) {
            words[dict[lineText[word]]] += iterator;
        }
        docs.push(words);
    }
    console.log(docs);
}

function rankDocs(query) {
    results = [];
    queryDoc = Array(dictSize).fill(0);
    queryBoW = clean(query).split(" ");

    for (word in queryBoW) {
        queryDoc[dict[queryBoW[word]]]++;
    }

    similarities = [];
    for (doc in docs) {
        similarities.push({"index": doc, "similarity": dotProduct(docs[doc], queryDoc)});
    }

    similarities.sort(function(a, b) {
        return b.similarity - a.similarity;
    });

    topDocs = [];
    matches = 10;
    for (var i = 0; i < NUM_RESULTS; i++) {
        if (similarities[i].index > 0) {
            topDocs.push(similarities[i].index);
        } else {
            matches = i;
            i = NUM_RESULTS;
        }
    }

    return topDocs;
}

function dotProduct(v1, v2) {
    // assumes equal length vectors
    var sum = 0;
    for (element in v1) {
        sum += v1[element] * v2[element];
    }
    return sum;
}
