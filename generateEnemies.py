import json
import random

enemyDict = {}

enemyTypes = ['spider', 'bat']
paths = ['bottomToTopWaves', 'topToBottomWaves']

def generateRandomEnemy(enemyTypes, paths, pathNums):
    retDict = {}
    retDict['type'] = random.choice(enemyTypes)
    if retDict['type'] == 'spider':
        retDict['flip'] = True
    else:
        retDict['flip'] = False
    retDict['path'] = random.choice(paths)
    retDict['pathNum'] = random.choice(pathNums)
    return retDict

def generateRandomEnemyJson(startDepth, finalDepth, minStep, maxStep):
    retJson = {}
    x = startDepth
    while x < finalDepth:
        retJson[str(x)] = [generateRandomEnemy(enemyTypes, paths, [0,1,2,3,4,5,6])]
        x += random.randint(minStep, maxStep)
    return retJson

#print(generateRandomEnemy(enemyTypes, paths, [0,1,2,3,4,5,6]))
#print()

enemyJson = generateRandomEnemyJson(10, 1200, 2, 8)

with open('enemyJson.json', 'w') as jsonFile:
    json.dump(enemyJson, jsonFile)