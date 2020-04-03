const analytics_url = "https://uva-video-analytics.herokuapp.com/api/a/";
const session_url = "https://uva-video-analytics.herokuapp.com/api/sessions/";
//const analytics_url = "/api/analytics";
//const session_url = "/api/sessions";
const track_events = "play pause ended volumechange seeked";

// still works best for single video b/c of these fields
var session_id = null;
var events = [];

// ON VIDEO LOAD

$("video").on('loadedmetadata', function(e) {
    console.log(e.target.src);
    while(e.target.src == null) {
    }
    try {
        input = {
            "time": $.now(),
            "collection": MD5(e.target.src),
            "duration": e.target.duration,
            "source" : e.target.src,
        };
        console.log(MD5(e.target.src));

        // Set a unique session id
        $.ajax({
            url: session_url,
            type: "POST",
            dataType: "json",
            data: JSON.stringify(input),
            contentType: "application/json",
            success: function(data){
                session_id = data.session_id;
                if (events.length != 0) {
                    console.log("Pushing backlogged events");
                    $.ajax({
                        url: analytics_url,
                        type: "POST",
                        dataType: "text",
                        data: JSON.stringify({"events": events, "session": session_id, "collection": MD5(e.target.src)}),
                        contentType: "application/json"
                    });
                    events = [];
                }

                // inject quiz
                try {
                    $(e.target).parent().prepend(generateQuizHTML(data.quiz));
                    // add show quiz button
                    $(e.target).parent().children(".vjs-control-bar").children(".vjs-remaining-time").after(`
                        <button class="show-quiz">Show Quiz</button>
                    `);
                    setUpQuiz(getQuiz(e.target));
                    //showQuiz(e.target);
                } catch(e) {
                    console.log(e);
                    console.log("Failed to generate quiz");
                }
            },
            error: function (xhr, ajaxOptions, thrownError) {
                alert(xhr.status);
                alert(thrownError);
            }
        });
        getScript(e.target);
        console.log(rankDocs("hi"));
    } catch (e) {
        console.log(e);
    }
});

// QUIZ

function generateQuizHTML(quiz) {
    return `
    <div class="vid-quiz" question=1>
        <div class="quiz-header">
            <p class="quiz-title">Post Quiz</p>
            <button type="button" class="exit-quiz">Exit Quiz</button>
        </div>
    ` + generateQuestionHTML(quiz.questions) + `
        <div class="quiz-nav">
            <button type="button" class="previous-question">Previous Question</button>
            <button type="button" class="next-question">Next Question</button>
            <button type="button" class="submit-answer">Submit Answer</button>
        </div>
    </div>
    `;
}

function generateQuestionHTML(questions) {
    var html = "";

    for (var i = 0; i < questions.length; i++) {
        html += `
        <div class="vid-quiz-question">
            <div class="question">
                <p class="question-content"><b>Q` + (i + 1) + ` of ` + questions.length + `: </b>` + questions[i].question + `</p>
                ` + generateOptionHTML(questions[i], i) + `
            </div>
            <div class="answer">
                <p class="question-content"><b>Q` + (i + 1) + ` of ` + questions.length + `: </b>` + questions[i].question + `</p>
                ` + generateAnswerHTML(questions[i]) + `
                <p class="percent-correct"></p>
                <button type="button" class="go-to-time" time=` + questions[i].time + `>Review Materials</button>
            </div>
        </div>
        `;
    }

    return html;
}

function generateAnswerHTML(question) {
    var html = "";
    var isCorrect = "";
    var hiddenMessage = "";

    if (question.radio) {
        type = "radio";
    } else {
        type = "checkbox";
    }

    for (var i = 0; i < question.answers.length; i++) {
        if (question.answers[i].correct) {
            isCorrect = "correct";
            hiddenMessage = " (Correct answer unselected)";
        } else {
            isCorrect = "incorrect";
            hiddenMessage = " (Incorrect answer selected)";
        }
        html += '<label class="quiz-option ' + isCorrect + '"><input type="' + type + '" disabled> ' + question.answers[i].value + '<p>' + hiddenMessage + '</p></label><br>';
    }

    return html;
}

function generateOptionHTML(question, index) {
    var html = "";
    var type = "";

    if (question.radio) {
        type = "radio";
    } else {
        type = "checkbox";
    }

    for (var i = 0; i < question.answers.length; i++) {
        html += '<label class="quiz-option"><input type="' + type + '" name="question' + index + '" value=' + i + '> ' + question.answers[i].value + '</label><br>';
    }

    return html;
}

function setUpQuiz(quiz) {
    $(".exit-quiz").click(function(e) {
        hideQuiz(e.target);
        sendEvent(e, "exitQuiz");
    });

    $(".previous-question").click(function(e) {
        var quiz = getQuiz(e.target);
        var question = parseInt($(quiz).attr("question"));
        hideQuestion(quiz, question);
        showQuestion(quiz, question - 1);
        $(quiz).attr("question", question - 1);
    });

    $(".next-question").click(function(e) {
        var quiz = getQuiz(e.target);
        var question = parseInt($(quiz).attr("question"));
        hideQuestion(quiz, question);
        showQuestion(quiz, question + 1);
        $(quiz).attr("question", question + 1);
    });

    $(".submit-answer").click(function(e) {
        var quiz = getQuiz(e.target);
        var question = parseInt($(quiz).attr("question"));
        var ans = parseAnswer(quiz, question);
        showAnswer(quiz, question);
        sendAnswer(e, question, ans);
    });

    $(".show-quiz").click(function(e) {
        $(e.target.closest('.video-js')).children("video").get(0).pause();
        showQuiz(e.target);
        sendEvent(e, "showQuiz");
    });

    $(".go-to-time").click(function(e) {
        console.log($(e.target).attr('time'));
        $(e.target.closest('.video-js')).children("video")[0].currentTime = $(e.target).attr('time');
        hideQuiz(e.target);
        sendEvent(e, "jumpToContent");
    });

    showQuestion(quiz, 1);
}

function parseAnswer(quiz, index) {
    // index starts at 1
    var question = $($(quiz).find(".vid-quiz-question")[index - 1]);
    var question_list = $(question.children(".question")[0]).find("input");
    var answer_list = $(question.children(".answer")[0]).find("label");
    var num_correct = 0;

    var correctArr = [];

    for (var i = 0; i < question_list.length; i++) {
        if (question_list[i].checked) {
            $(answer_list[i]).addClass("selected");
            $($(answer_list[i]).children("input")[0]).attr("checked", true);

            if ($(answer_list[i]).hasClass("correct")) {
                num_correct++;
                correctArr.push(true);
            } else {
                correctArr.push(false);
            }
        } else {
            if ($(answer_list[i]).hasClass("incorrect")) {
                num_correct++;
                correctArr.push(true);
            } else {
                correctArr.push(false);
            }
        }
    }
    $($(question).find(".percent-correct")[0]).text(num_correct + " of " + question_list.length + " correct");
    return correctArr;
}

function showAnswer(quiz, index) {
    // index starts at 1
    var question = $($(quiz).find(".vid-quiz-question")[index - 1]);
    $(question.children(".question")[0]).css("display", "none");
    $(question.children(".answer")[0]).css("display", "block");
    question.attr("submitted", "true");
    $($(quiz).find(".submit-answer")[0]).css("visibility", "hidden");
}

function showQuestion(quiz, index) {
    // index starts at 1
    $($(quiz).find(".vid-quiz-question")[index - 1]).css("display", "block");

    if (index == 1) {
        $($(quiz).find(".previous-question")[0]).css("visibility", "hidden");
    }

    if (index == $(quiz).find(".vid-quiz-question").length) {
        $($(quiz).find(".next-question")[0]).css("visibility", "hidden");
    }

    if ($($(quiz).find(".vid-quiz-question")[index - 1]).attr("submitted") == "true") {
        $($(quiz).find(".submit-answer")[0]).css("visibility", "hidden");
    } else {
        $($(quiz).find(".submit-answer")[0]).css("visibility", "visible");
    }
}

function hideQuestion(quiz, index) {
    // index starts at 1
    $($(quiz).find(".vid-quiz-question")[index - 1]).css("display", "none");

    if (index == 1) {
        $($(quiz).find(".previous-question")[0]).css("visibility", "visible");
    }

    if (index == $(quiz).find(".vid-quiz-question").length) {
        $($(quiz).find(".next-question")[0]).css("visibility", "visible");
    }
}

function showQuiz(target) {
    $(getQuiz(target)).css("display", "block");
}

$("video").on("ended", function(e) {
    showQuiz(e.target);
});

function hideQuiz(target) {
    $(getQuiz(target)).css("display", "none");
}

function getQuiz(target) {
    return $(target.closest('.video-js')).children('.vid-quiz')[0];
}

// TRACK EVENTS

function sendEventData(input, src) {
    if (session_id != null) {
        arr = [];
        arr.push(input);
        $.ajax({
            url: analytics_url,
            type: "POST",
            dataType: "text",
            data: JSON.stringify({"events": arr, "session": session_id, "collection": MD5(src)}),
            contentType: "application/json"
        });
    } else {
        events.push(input);
    }
}

function sendAnswer(e, question, answers) {
    var vid = $(e.target.closest('.video-js')).children('video')[0];
    input = {
        "event": "submitAnswer",
        "time": e.timeStamp,
        "vidTime": vid.currentTime,
        "volume": vid.volume,
        "playbackRate": vid.playbackRate,
        "paused": vid.paused,
        "question": question - 1, // send index of question
        "answers": answers, // correct vs incorrect
    };
    sendEventData(input, vid.src);
}

function sendEvent(e, eventName) {
    var vid = $(e.target.closest('.video-js')).children('video')[0];
    input = {
        "event": eventName,
        "time": e.timeStamp,
        "vidTime": vid.currentTime,
        "volume": vid.volume,
        "playbackRate": vid.playbackRate,
        "paused": vid.paused,
    };
    sendEventData(input, vid.src);
}

$("video").on(track_events, function(e) {
    input = {
        "event": e.type,
        "time": e.timeStamp,
        "vidTime": e.target.currentTime,
        "volume": e.target.volume,
        "playbackRate": e.target.playbackRate,
        "paused": e.target.paused,
    };
    sendEventData(input, e.target.src);
});

// Cature video-js playback speed changes
$('.vjs-playback-rate div ul li, button.vjs-playback-rate').on('click', function(e) {
    sendEvent(e, "playbackSpeed");
});

MD5 = function(e) {
    function h(a, b) {
        var c, d, e, f, g;
        e = a & 2147483648;
        f = b & 2147483648;
        c = a & 1073741824;
        d = b & 1073741824;
        g = (a & 1073741823) + (b & 1073741823);
        return c & d ? g ^ 2147483648 ^ e ^ f : c | d ? g & 1073741824 ? g ^ 3221225472 ^ e ^ f : g ^ 1073741824 ^ e ^ f : g ^ e ^ f
    }

    function k(a, b, c, d, e, f, g) {
        a = h(a, h(h(b & c | ~b & d, e), g));
        return h(a << f | a >>> 32 - f, b)
    }

    function l(a, b, c, d, e, f, g) {
        a = h(a, h(h(b & d | c & ~d, e), g));
        return h(a << f | a >>> 32 - f, b)
    }

    function m(a, b, d, c, e, f, g) {
        a = h(a, h(h(b ^ d ^ c, e), g));
        return h(a << f | a >>> 32 - f, b)
    }

    function n(a, b, d, c, e, f, g) {
        a = h(a, h(h(d ^ (b | ~c), e), g));
        return h(a << f | a >>> 32 - f, b)
    }

    function p(a) {
        var b = "",
            d = "",
            c;
        for (c = 0; 3 >= c; c++) d = a >>> 8 * c & 255, d = "0" + d.toString(16), b += d.substr(d.length - 2, 2);
        return b
    }
    var f = [],
        q, r, s, t, a, b, c, d;
    e = function(a) {
        a = a.replace(/\r\n/g, "\n");
        for (var b = "", d = 0; d < a.length; d++) {
            var c = a.charCodeAt(d);
            128 > c ? b += String.fromCharCode(c) : (127 < c && 2048 > c ? b += String.fromCharCode(c >> 6 | 192) : (b += String.fromCharCode(c >> 12 | 224), b += String.fromCharCode(c >> 6 & 63 | 128)), b += String.fromCharCode(c & 63 | 128))
        }
        return b
    }(e);
    f = function(b) {
        var a, c = b.length;
        a = c + 8;
        for (var d = 16 * ((a - a % 64) / 64 + 1), e = Array(d - 1), f = 0, g = 0; g < c;) a = (g - g % 4) / 4, f = g % 4 * 8, e[a] |= b.charCodeAt(g) << f, g++;
        a = (g - g % 4) / 4;
        e[a] |= 128 << g % 4 * 8;
        e[d - 2] = c << 3;
        e[d - 1] = c >>> 29;
        return e
    }(e);
    a = 1732584193;
    b = 4023233417;
    c = 2562383102;
    d = 271733878;
    for (e = 0; e < f.length; e += 16) q = a, r = b, s = c, t = d, a = k(a, b, c, d, f[e + 0], 7, 3614090360), d = k(d, a, b, c, f[e + 1], 12, 3905402710), c = k(c, d, a, b, f[e + 2], 17, 606105819), b = k(b, c, d, a, f[e + 3], 22, 3250441966), a = k(a, b, c, d, f[e + 4], 7, 4118548399), d = k(d, a, b, c, f[e + 5], 12, 1200080426), c = k(c, d, a, b, f[e + 6], 17, 2821735955), b = k(b, c, d, a, f[e + 7], 22, 4249261313), a = k(a, b, c, d, f[e + 8], 7, 1770035416), d = k(d, a, b, c, f[e + 9], 12, 2336552879), c = k(c, d, a, b, f[e + 10], 17, 4294925233), b = k(b, c, d, a, f[e + 11], 22, 2304563134), a = k(a, b, c, d, f[e + 12], 7, 1804603682), d = k(d, a, b, c, f[e + 13], 12, 4254626195), c = k(c, d, a, b, f[e + 14], 17, 2792965006), b = k(b, c, d, a, f[e + 15], 22, 1236535329), a = l(a, b, c, d, f[e + 1], 5, 4129170786), d = l(d, a, b, c, f[e + 6], 9, 3225465664), c = l(c, d, a, b, f[e + 11], 14, 643717713), b = l(b, c, d, a, f[e + 0], 20, 3921069994), a = l(a, b, c, d, f[e + 5], 5, 3593408605), d = l(d, a, b, c, f[e + 10], 9, 38016083), c = l(c, d, a, b, f[e + 15], 14, 3634488961), b = l(b, c, d, a, f[e + 4], 20, 3889429448), a = l(a, b, c, d, f[e + 9], 5, 568446438), d = l(d, a, b, c, f[e + 14], 9, 3275163606), c = l(c, d, a, b, f[e + 3], 14, 4107603335), b = l(b, c, d, a, f[e + 8], 20, 1163531501), a = l(a, b, c, d, f[e + 13], 5, 2850285829), d = l(d, a, b, c, f[e + 2], 9, 4243563512), c = l(c, d, a, b, f[e + 7], 14, 1735328473), b = l(b, c, d, a, f[e + 12], 20, 2368359562), a = m(a, b, c, d, f[e + 5], 4, 4294588738), d = m(d, a, b, c, f[e + 8], 11, 2272392833), c = m(c, d, a, b, f[e + 11], 16, 1839030562), b = m(b, c, d, a, f[e + 14], 23, 4259657740), a = m(a, b, c, d, f[e + 1], 4, 2763975236), d = m(d, a, b, c, f[e + 4], 11, 1272893353), c = m(c, d, a, b, f[e + 7], 16, 4139469664), b = m(b, c, d, a, f[e + 10], 23, 3200236656), a = m(a, b, c, d, f[e + 13], 4, 681279174), d = m(d, a, b, c, f[e + 0], 11, 3936430074), c = m(c, d, a, b, f[e + 3], 16, 3572445317), b = m(b, c, d, a, f[e + 6], 23, 76029189), a = m(a, b, c, d, f[e + 9], 4, 3654602809), d = m(d, a, b, c, f[e + 12], 11, 3873151461), c = m(c, d, a, b, f[e + 15], 16, 530742520), b = m(b, c, d, a, f[e + 2], 23, 3299628645), a = n(a, b, c, d, f[e + 0], 6, 4096336452), d = n(d, a, b, c, f[e + 7], 10, 1126891415), c = n(c, d, a, b, f[e + 14], 15, 2878612391), b = n(b, c, d, a, f[e + 5], 21, 4237533241), a = n(a, b, c, d, f[e + 12], 6, 1700485571), d = n(d, a, b, c, f[e + 3], 10, 2399980690), c = n(c, d, a, b, f[e + 10], 15, 4293915773), b = n(b, c, d, a, f[e + 1], 21, 2240044497), a = n(a, b, c, d, f[e + 8], 6, 1873313359), d = n(d, a, b, c, f[e + 15], 10, 4264355552), c = n(c, d, a, b, f[e + 6], 15, 2734768916), b = n(b, c, d, a, f[e + 13], 21, 1309151649), a = n(a, b, c, d, f[e + 4], 6, 4149444226), d = n(d, a, b, c, f[e + 11], 10, 3174756917), c = n(c, d, a, b, f[e + 2], 15, 718787259), b = n(b, c, d, a, f[e + 9], 21, 3951481745), a = h(a, q), b = h(b, r), c = h(c, s), d = h(d, t);
    return (p(a) + p(b) + p(c) + p(d)).toLowerCase()
};
