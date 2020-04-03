'''
Shows the combined time spent on each section
of the video. Without normalizing, the displayed
time represents the total amount of seconds spent
within that interval.
'''

from pymongo import MongoClient
import json
import pandas
import math
from bson.json_util import dumps

import os
mongoUser = os.environ["MONGO_USER"]
mongoPass = os.environ["MONGO_PASS"]

# interval in seconds
INTERVAL = 1

def getData():
    client = MongoClient("mongodb+srv://" + mongoUser + ":" + mongoPass + "@primary-xqeyo.mongodb.net/test?retryWrites=true&w=majority")
    db = client["videoAnalytics"]
    collection = db["90e47cf057281cdd0d76b1f2b55f4031"]

    data = collection.find()

    list = []
    for item in data:
        list.append(item)

    return list

def normalize(data, factor):
    i = 0
    while i < len(data):
        data[i] = data[i] / factor
        i = i + 1

    return data

# removes the sessions which never triggered 'action'
def removeNoAction(data, action):
    for item in data[:]:
        try:
            if item.get("source") != "":
                print(item.get("source"))
        except Exception as e:
            pass
        remove = True

        try:
            for event in item.get("events"):
                if event.get("event") == action:
                    remove = False
        except Exception as e:
            remove = True

        if remove:
            data.remove(item)

    return data

def rm_main():
    data = getData()

    # Apply filters
    data = removeNoAction(data, "play")

    size = math.ceil(data[0].get("duration") / INTERVAL)
    timeWatched = [0] * size

    for item in data:
        event = item.get("events")[0]

        startTime = event.get("time") / 1000
        endTime = 0
        startVidTime = event.get("vidTime")
        endVidTime = 0
        playbackRate = 1
        playing = False
        index = 1

        while index < len(item.get("events")):
            event = item.get("events")[index]

            endTime = event.get("time") / 1000
            endVidTime = event.get("vidTime")
            playing = not event.get("paused")
            playbackRate = event.get("playbackRate")

            if playing:
                startIndex = math.floor(startVidTime / INTERVAL)
                endIndex = math.floor(endVidTime / INTERVAL)

                # remove a bit from start and end
                removeTime = startTime % INTERVAL
                timeWatched[startIndex] = timeWatched[startIndex] - (removeTime / playbackRate)

                removeTime = INTERVAL - (endTime % INTERVAL)
                timeWatched[endIndex] = timeWatched[endIndex] - (removeTime / playbackRate)

                while startIndex <= endIndex:
                    timeWatched[startIndex] = timeWatched[startIndex] + (INTERVAL / playbackRate)
                    startIndex = startIndex + 1
            else:
                timeWatched[math.floor(startVidTime / INTERVAL)] = timeWatched[math.floor(startVidTime / INTERVAL)] + endTime - startTime

            startTime = endTime
            startVidTime = endVidTime
            index = index + 1

    #timeWatched = normalize(timeWatched, INTERVAL)

    return pandas.read_json(dumps(timeWatched))
