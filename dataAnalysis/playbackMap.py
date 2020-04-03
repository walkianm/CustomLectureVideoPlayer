'''
Shows the combined playback, where each session can
watch each section of the video multiple times.
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
INTERVAL = 0.1

def getData():
    client = MongoClient("mongodb+srv://" + mongoUser + ":" + mongoPass + "@primary-xqeyo.mongodb.net/test?retryWrites=true&w=majority")
    db = client["videoAnalytics"]
    collection = db["90e47cf057281cdd0d76b1f2b55f4031"]

    data = collection.find()

    list = []
    for item in data:
        list.append(item)

    return list

# removes the sessions which never triggered 'action'
def removeNoAction(data, action):
    for item in data[:]:
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
    data = removeNoAction(data, "seeked")

    size = math.ceil(data[0].get("duration") / INTERVAL)
    timesWatched = [0] * size

    for item in data:
        start = 0
        stop = 0
        index = 0

        while index < len(item.get("events")):
            start = stop
            started = False
            stopped = False

            while not started and index < len(item.get("events")):
                if not item.get("events")[index].get("paused"):
                    start = math.floor(item.get("events")[index].get("vidTime") / INTERVAL)
                    started = True
                index = index + 1

            stop = start

            while not stopped and index < len(item.get("events")):
                if item.get("events")[index].get("paused"):
                    stop = math.floor(item.get("events")[index].get("vidTime") / INTERVAL)
                    stopped = True
                index = index + 1

            if not stopped:
                stop = len(timesWatched) - 1

            if started:
                while start <= stop:
                    timesWatched[start] = timesWatched[start] + 1
                    start = start + 1

            index = index + 1

    return pandas.read_json(dumps(timesWatched))
