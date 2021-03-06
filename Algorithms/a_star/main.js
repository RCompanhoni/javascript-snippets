"use strict";

const SIMULATION_SPEED = 100;

const TILE_WIDTH = 32;
const TILE_HEIGHT = 32;

let statusDisplay;
let environment;
let agent;
let simulationId;
let paused = false;

function runSimulation() {
    clearInterval(simulationId);
    if (statusDisplay) {
        statusDisplay.clear();
    }

    // world parameters
    const worldCanvas = document.getElementById('world-canvas');
    const agentCanvas = document.getElementById('agent-canvas');
    const worldSize = Number(document.getElementById('world-size').value);
    const garbagePercentage = Number(document.getElementById('garbage-percentage').value);
    const fuelStationQuantity = Number(document.getElementById('fuel-station-quantity').value);
    const garbageCanQuantity = Number(document.getElementById('garbage-can-quantity').value);

    // agent parameters
    const agentGarbageCapacity = Number(document.getElementById('agent-garbage-capacity').value);
    const agentFuelCapacity = Number(document.getElementById('agent-fuel-capacity').value)

    // display status textarea
    statusDisplay = new StatusDisplay(worldSize);

    // when spritesheet is loaded then create environment, agent and start simulation
    let spritesheet = new Image();
    spritesheet.src = './img/spritesheet.png';
    spritesheet.onload = function() {
        environment = new Environment(this, worldCanvas, agentCanvas, worldSize, garbagePercentage, fuelStationQuantity, garbageCanQuantity);
        agent = new Agent(environment.getMap(), agentGarbageCapacity, agentFuelCapacity);

        statusDisplay.print("SIMULAÇÃO INICIADA\n");
        
        // agent acts on initial spot and starts moving
        let actionResult = agentEnvironmentInteraction();
        statusDisplay.printStatus(actionResult.status)
        agent.startMoving();

        // simulation loop
        simulationId = setInterval(function () {
            if (!paused) {
                actionResult = agentEnvironmentInteraction();
                statusDisplay.printStatus(actionResult.status)
    
                if (actionResult.status === STATUS_OUT_OF_FUEL) {
                    clearInterval(simulationId);
                    statusDisplay.print("\nSIMULAÇÃO TERMINADA -- SEM COMBUSTÍVEL")
                }
    
                if (actionResult.status === STATUS_WORLD_CLEARED) {
                    clearInterval(simulationId);
                    statusDisplay.print("\nSIMULAÇÃO TERMINADA.")
                }
            } 
        }, SIMULATION_SPEED);
    } 
}

// agent reacts to the environment -- its actions are then applied to the environment
function agentEnvironmentInteraction() {
    const currentState = environment.getState(agent.currentSpot)
    const actionResult = agent.act(currentState);
    environment.applyAgentAction(actionResult);
    return actionResult;
}

function togglePauseSimulation() {
    if (paused) {
        paused = false;
    } else {
        paused = true;
        statusDisplay.print("\n SIMULAÇÃO PAUSADA");
    }
}
