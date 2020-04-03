#!/usr/bin/env python3

import speech_recognition as sr
import soundfile as sf
from os import path

AUDIO_FILE = path.join(path.dirname(path.realpath(__file__)), "audio.wav")
f = sf.SoundFile(AUDIO_FILE)

PHRASE_LENGTH = 5 # all phrases less than this length are guarenteed a continuous block

# use the audio file as the audio source
r = sr.Recognizer()

# with sr.AudioFile(AUDIO_FILE) as source:
#     audio = r.record(source)  # read the entire audio file
#     print(r.recognize_sphinx(audio))

output = open("script.txt", "w+")
for i in range(0, int(len(f) / f.samplerate), PHRASE_LENGTH): #int(len(f) / f.samplerate)
    with sr.AudioFile(AUDIO_FILE) as source:
        audio = r.record(source, PHRASE_LENGTH * 2, i)  # read the entire audio file
        # recognize speech using Sphinx
        try:
            #chunks.append(r.recognize_sphinx(audio))
            output.write(r.recognize_sphinx(audio) + "\n")
        except sr.UnknownValueError:
            print("Sphinx could not understand audio")
        except sr.RequestError as e:
            print("Sphinx error; {0}".format(e))
        if i % 60 == 0:
            print(str(int(i / 60)) + "/" + str(int(len(f) / f.samplerate / 60)))

output.close()
