"use strict";

const MOVEMENT_STOPPED = 'movement stopped';
const MOVEMENT_MOVING = 'movement moving';
const MOVEMENT_FOWARD_ROUTE = 'movement foward route';
const MOVEMENT_BACKWARDS_ROUTE = 'movement backwards route';
const MOVEMENT_REFUELING = 'movement refueling';
const MOVEMENT_DISPOSING_GARBAGE = 'movement disposing garbage';

const SOUTH = 'south';
const SOUTHWEST = 'southWest';
const WEST = 'west';
const NORTHWEST = 'northWest';
const NORTH = 'north';
const NORTHEAST = 'northEast';
const EAST = 'east';
const SOUTHEAST = 'southEast';

class Agent {
    constructor(worldMap, garbageCapacityLimit, fuelCapacity) {
        this.currentSpot = new Spot(0, 0);

        this.fuelCapacity = fuelCapacity;
        this.fuelLevel = fuelCapacity;
        this.onRefuelRoute = false;

        this.garbageCapacityLimit = garbageCapacityLimit;
        this.garbageCapacity = garbageCapacityLimit;
        this.onGarbageDisposalRoute = false;

        this.currentDirection = SOUTH;
        this.movementStatus = MOVEMENT_STOPPED;
        this.previousDirection = null;

        this.mustGoBack = false;
        this.toCurve = true;

        this.map = worldMap;
        this.worldSize = this.map[0].length;

        this.routeStep = 0;
    }

    act(state) {
        // mark current spot as visited on the agent's map
        this.map[this.currentSpot.x][this.currentSpot.y].isVisited = true;

        this.currentSpot.content = state;
        let action = new Action(this.currentSpot.x, this.currentSpot.y, STATUS_NO_CHANGES);

        // FUEL IS OVER
        if (this.fuelLevel === 0) {
            action = new Action(this.currentSpot.x, this.currentSpot.y, STATUS_OUT_OF_FUEL);
        }

        // ON ROUTE -- MOVING FOWARD
        else if (this.movementStatus === MOVEMENT_FOWARD_ROUTE) {
            action = this.routeStepFoward();
        }

        // ON ROUTE -- MOVING BACKWARDS
        else if (this.movementStatus === MOVEMENT_BACKWARDS_ROUTE) {
            action = this.routeStepBackward();
        }

        // REFUEL
        else if (this.movementStatus === MOVEMENT_REFUELING) {
            action = this.refuel();
        }

         // DISPOSING GARBAGE
         else if (this.movementStatus === MOVEMENT_DISPOSING_GARBAGE) {
            action = this.disposeGarbage();
        }

        // LOW FUEL
        else if (this.fuelLevel <= 30) {
            action = this.generateRouteToClosestFuelStation();
        }

        // GARBAGE CAPACITY OVER
        else if (this.garbageCapacity === 0) {
            action = this.generateRouteToClosestGarbageCan();
        }
        
        // DIRTY SPOT FOUND
        else if (this.currentSpot.content === GARBAGE && this.garbageCapacity > 0 && this.fuelLevel >= 30) {
            action = this.clean();
        }

        // OBSTACLE
        else if (this.collisionAhead(this.currentDirection)) {
            action = this.generateRouteToNextAvailableSpot();
        }

        // MAP BORDER REACHED
        else if (this.endOfMap()) {
            action = this.switchDirection();
        }

        // SIMPLE MOVEMENT
        else if (this.movementStatus === MOVEMENT_MOVING) {
            action = this.move();
        }

        if (this.isWholeWorldVisited()) {
            action.status = STATUS_WORLD_CLEARED;
        }

        return action;
    }

    /********************* STATE HANDLERS *********************/

    refuel() {
        this.fuelLevel += 10;
        this.updateFuelDisplay();

        if (this.fuelLevel >= this.fuelCapacity) {
            this.fuelLevel = this.fuelCapacity;
            this.updateFuelDisplay();
            this.movementStatus = MOVEMENT_BACKWARDS_ROUTE;

            return new Action(this.currentSpot.x, this.currentSpot.y, STATUS_BACKWARDS_ROUTE);
        }

        return new Action(this.currentSpot.x, this.currentSpot.y, STATUS_REFUELING);
    }

    disposeGarbage() {
        this.garbageCapacity += 2;
        this.updateGarbageDisplay();

        if (this.garbageCapacity >= this.garbageCapacityLimit) {
            this.garbageCapacity = this.garbageCapacityLimit;
            this.updateGarbageDisplay();
            this.movementStatus = MOVEMENT_BACKWARDS_ROUTE;

            return new Action(this.currentSpot.x, this.currentSpot.y, STATUS_BACKWARDS_ROUTE);
        }

        return new Action(this.currentSpot.x, this.currentSpot.y, STATUS_DISPOSING_GARBAGE);
    }

    clean() {
        this.garbageCapacity--;
        this.updateGarbageDisplay();

        return new Action(this.currentSpot.x, this.currentSpot.y, STATUS_SPOT_CLEARED);
    }

    move() {
        this.moveOneSpot();
        return new Action(this.currentSpot.x, this.currentSpot.y, STATUS_MOVED);
    }

    routeStepFoward() {
        this.routeStep++;
        let actionStatus = STATUS_FOWARD_ROUTE;

        if (this.routeStep >= this.route.length) {
            if (this.onRefuelRoute) {
                this.onRefuelRoute = false;
                actionStatus = STATUS_REFUELING;
                this.movementStatus = MOVEMENT_REFUELING;
                this.routeStep--;
            } 
            else if (this.onGarbageDisposalRoute) {
                this.onGarbageDisposalRoute = false;
                actionStatus = STATUS_DISPOSING_GARBAGE;
                this.movementStatus = MOVEMENT_DISPOSING_GARBAGE;
                this.routeStep--;
            }
            else {
                this.currentDirection = this.previousDirection;
                this.movementStatus = MOVEMENT_MOVING;
                actionStatus = STATUS_DESTINATION_REACHED;
                this.routeStep = 0;
            }
        } else {
            const nextSpot = this.route[this.routeStep];
            const neighbours = this.getNeighbours(this.currentSpot);
            this.currentDirection = Object.keys(neighbours).find(key => {
                if (neighbours[key]) {
                    return neighbours[key].x === nextSpot.x && neighbours[key].y === nextSpot.y;
                }

                return false;
            });
            this.moveOneSpot();
        }

        return new Action(this.currentSpot.x, this.currentSpot.y, actionStatus);
    }

    routeStepBackward() {
        let actionStatus = STATUS_BACKWARDS_ROUTE;
        this.routeStep--;

        if (this.routeStep < 0) {
            this.currentDirection = this.previousDirection;
            this.movementStatus = MOVEMENT_MOVING;
            actionStatus = STATUS_DESTINATION_REACHED;
        } else {
            const nextSpot = this.route[this.routeStep];
            const neighbours = this.getNeighbours(this.currentSpot);
            this.currentDirection = Object.keys(neighbours).find(key => {
                if (neighbours[key]) {
                    return neighbours[key].x === nextSpot.x && neighbours[key].y === nextSpot.y;
                }

                return false;
            });

            this.moveOneSpot();
        }

        return new Action(this.currentSpot.x, this.currentSpot.y, actionStatus);
    }

    generateRouteToNextAvailableSpot() {
        let destination;
        switch (this.currentDirection) {
            case NORTH:
                // tries next posiion on same column
                for (let y = this.currentSpot.y - 1; y >= 0; y--) {
                    if (this.map[this.currentSpot.x][y].content === GRASS) {
                        destination = this.map[this.currentSpot.x][y];
                        break;
                    }
                }

                // tries free position on next column
                if (!destination) {
                    let nextX = this.currentSpot.x;
                    nextX++;

                    for (let nextY = 0; nextY < this.worldSize; nextY++) {
                        if (this.map[nextX][nextY].content === GRASS) {
                            destination = this.map[nextX][nextY];
                            break;
                        }
                    }

                    this.toCurve = false;
                    this.currentDirection = SOUTH;
                }

                break;

            case EAST:
                let rightX = this.currentSpot.x;
                rightX++;

                for (let y = this.currentSpot.y; y >= 0; y--) {
                    if (this.map[rightX][y].content === GRASS) {
                        destination = this.map[rightX][y];
                        break;
                    }
                }
                break;

            case SOUTH:
                // tries next posiion on same column
                for (let y = this.currentSpot.y + 1; y < this.worldSize - 1; y++) {
                    if (this.map[this.currentSpot.x][y].content === GRASS) {
                        destination = this.map[this.currentSpot.x][y];
                        break;
                    }
                }

                // tries free position on next column
                if (!destination) {
                    let nextX = this.currentSpot.x + 1;

                    for (let nextY = this.worldSize - 1; nextY >= 0; nextY--) {
                        if (this.map[nextX][nextY].content === GRASS) {
                            destination = this.map[nextX][nextY];
                            break;
                        }
                    }

                    this.toCurve = false;
                    this.currentDirection = NORTH;
                }

                break;
        }

        // A*
        this.route = this.findPath(this.map[this.currentSpot.x][this.currentSpot.y], destination);
        this.movementStatus = MOVEMENT_FOWARD_ROUTE;
        return new Action(this.currentSpot.x, this.currentSpot.y, STATUS_ROUTE_DEFINED);
    }

    generateRouteToClosestFuelStation() {
        this.previousDirection = this.currentDirection;

        // finds the closest fuel station on map
        let closestFuelStation;
        for (let x = 0; x < this.worldSize; x++) {
            for (let y = 0; y < this.worldSize; y++) {
                let spot = this.map[x][y];
                if (spot.content === FUEL_STATION) {
                    if (!closestFuelStation) {
                        closestFuelStation = spot;
                    } else {
                        let closestDistance = this.distance(this.currentSpot, closestFuelStation);
                        let candidateDistance = this.distance(this.currentSpot, spot);

                        if (candidateDistance < closestDistance) {
                            closestFuelStation = spot;
                        }
                    }
                }
            }
        }

        const neighbours = this.getNeighbours(closestFuelStation);
        const directions = Object.keys(neighbours);

        // check if already in a neighbour spot
        let closestParkingSpace = this.currentSpot;
        const alreadyInParkingSpace = directions.find(direction => {
            if (neighbours[direction]) {
                return neighbours[direction].x === this.currentSpot.x && neighbours[direction].y === this.currentSpot.y;
            }

            return false;
        });

        // refuel immediately else get its neighbours and create a route to a spot to park and refuel
        if (alreadyInParkingSpace) {
            this.movementStatus = MOVEMENT_REFUELING;
            return new Action(this.currentSpot.x, this.currentSpot.y, STATUS_REFUELING);
        } else {
            closestParkingSpace = directions.reduce((closestNeighbour, direction) => {
                const neighbour = neighbours[direction];

                if (!closestNeighbour) {
                    return neighbour;
                }

                if (neighbour && neighbour.content === GRASS) {
                    const bestDistance = this.distance(this.currentSpot, closestNeighbour);
                    const candidateDistance = this.distance(this.currentSpot, neighbour);

                    return bestDistance < candidateDistance ? closestNeighbour : neighbour;
                }

                return closestNeighbour;
            }, neighbours[EAST]);

            this.onRefuelRoute = true;

            this.route = this.findPath(this.map[this.currentSpot.x][this.currentSpot.y], closestParkingSpace);
            this.movementStatus = MOVEMENT_FOWARD_ROUTE;
            return new Action(this.currentSpot.x, this.currentSpot.y, STATUS_ROUTE_DEFINED);
        }
    }

    generateRouteToClosestGarbageCan() {
        this.previousDirection = this.currentDirection;

        // finds the closest garbage can on the map
        let closestGarbageCan;
        for (let x = 0; x < this.worldSize; x++) {
            for (let y = 0; y < this.worldSize; y++) {
                let spot = this.map[x][y];
                if (spot.content === GARBAGE_CAN) {
                    if (!closestGarbageCan) {
                        closestGarbageCan = spot;
                    } else {
                        let closestDistance = this.distance(this.currentSpot, closestGarbageCan);
                        let candidateDistance = this.distance(this.currentSpot, spot);

                        if (candidateDistance < closestDistance) {
                            closestGarbageCan = spot;
                        }
                    }
                }
            }
        }

        const neighbours = this.getNeighbours(closestGarbageCan);
        const directions = Object.keys(neighbours);

        // check if already in a neighbour spot
        let closestParkingSpace = this.currentSpot;
        const alreadyInParkingSpace = directions.find(direction => {
            if (neighbours[direction]) {
                return neighbours[direction].x === this.currentSpot.x && neighbours[direction].y === this.currentSpot.y;
            }

            return false;
        });

        // refuel immediately else get its neighbours and create a route to a spot to park and refuel
        if (alreadyInParkingSpace) {
            this.movementStatus = MOVEMENT_DISPOSING_GARBAGE;
            return new Action(this.currentSpot.x, this.currentSpot.y, STATUS_DISPOSING_GARBAGE);
        } else {
            closestParkingSpace = directions.reduce((closestNeighbour, direction) => {
                const neighbour = neighbours[direction];

                if (!closestNeighbour) {
                    return neighbour;
                }

                if (neighbour && neighbour.content === GRASS) {
                    const bestDistance = this.distance(this.currentSpot, closestNeighbour);
                    const candidateDistance = this.distance(this.currentSpot, neighbour);

                    return bestDistance < candidateDistance ? closestNeighbour : neighbour;
                }

                return closestNeighbour;
            }, neighbours[EAST]);

            this.onGarbageDisposalRoute = true;

            this.route = this.findPath(this.map[this.currentSpot.x][this.currentSpot.y], closestParkingSpace);
            this.movementStatus = MOVEMENT_FOWARD_ROUTE;
            return new Action(this.currentSpot.x, this.currentSpot.y, STATUS_ROUTE_DEFINED);
        }
    }

    switchDirection() {
        if (this.toCurve) {
            this.previousDirection = this.currentDirection;
            this.currentDirection = EAST;
            this.moveOneSpot();
        } else {
            this.toCurve = true;
        }

        if (this.previousDirection === SOUTH) {
            this.currentDirection = NORTH;
        } else if (this.previousDirection === NORTH) {
            this.currentDirection = SOUTH;
        }

        return new Action(this.currentSpot.x, this.currentSpot.y, STATUS_MOVED);
    }

    /********************* HELPERS *********************/

    updateFuelDisplay() {
        document.getElementById('fuel-capacity').innerText = this.fuelLevel;
    }

    updateGarbageDisplay() {
        document.getElementById('garbage-capacity').innerText = this.garbageCapacity;
    }

    startMoving() {
        this.movementStatus = MOVEMENT_MOVING;
    }

    endOfMap() {
        if (this.currentDirection === SOUTH && (this.currentSpot.y + 1) == this.worldSize) {
            return true;
        }

        if (this.currentDirection === NORTH && this.currentSpot.y === 0) {
            return true;
        }

        return false;
    }

    moveOneSpot() {
        switch (this.currentDirection) {
            case WEST:
                this.currentSpot.x--;
                break;

            case NORTHWEST:
                this.currentSpot.x--;
                this.currentSpot.y--;
                break;

            case NORTH:
                this.currentSpot.y--;
                break;

            case NORTHEAST:
                this.currentSpot.x++;
                this.currentSpot.y--;
                break;

            case EAST:
                this.currentSpot.x++;
                break;

            case SOUTHEAST:
                this.currentSpot.x++;
                this.currentSpot.y++;
                break;

            case SOUTH:
                this.currentSpot.y++;
                break;

            case SOUTHWEST:
                this.currentSpot.x--;
                this.currentSpot.y++;
                break;
        }

        this.fuelLevel--;
        this.updateFuelDisplay();
    }

    isWholeWorldVisited() {
        let clearedSpots = 0;

        for (let x = 0; x < this.worldSize; x++) {
            for (let y = 0; y < this.worldSize; y++) {
                if (this.map[x][y].isVisited || this.map[x][y].content === WALL || this.map[x][y].content === FUEL_STATION || this.map[x][y].content === GARBAGE_CAN) {
                    clearedSpots++;
                } else {
                    return false;
                }
            }
        }

        return clearedSpots === Math.pow(this.worldSize, 2);
    }

    // returns an object where each key is a direction and each value a Spot object
    getNeighbours(spot) {
        let x = spot.x;
        let y = spot.y;

        // if neighbour is outside the map then returns undefined
        return {
            west: this.map[x - 1] !== undefined ? this.map[x - 1][y] : undefined,
            northWest: this.map[x - 1] !== undefined ? this.map[x - 1][y - 1] : undefined,
            north: this.map[x] !== undefined ? this.map[x][y - 1] : undefined,
            northEast: this.map[x + 1] !== undefined ? this.map[x + 1][y - 1] : undefined,
            east: this.map[x + 1] !== undefined ? this.map[x + 1][y] : undefined,
            southEast: this.map[x + 1] !== undefined ? this.map[x + 1][y + 1] : undefined,
            south: this.map[x] !== undefined ? this.map[x][y + 1] : undefined,
            southWest: this.map[x - 1] !== undefined ? this.map[x - 1][y + 1] : undefined
        };
    }

    collisionAhead(direction) {
        this.previousDirection = this.currentDirection;
        this.mustGoBack = false;

        const neighbours = this.getNeighbours(this.currentSpot);

        switch (direction) {
            case NORTH:
                if (neighbours.north) {
                    return (neighbours.north.content === WALL || neighbours.north.content === FUEL_STATION || neighbours.north.content === GARBAGE_CAN);
                }

                break;

            case SOUTH:
                if (neighbours.south) {
                    return (neighbours.south.content === WALL || neighbours.south.content === FUEL_STATION || neighbours.south.content === GARBAGE_CAN);
                }

                break;
        }

        return false;
    }

    clearParentsFromMap() {
        for (let x = 0; x < this.worldSize; x++) {
            for (let y = 0; y < this.worldSize; y++) {
                delete this.map[x][y].parent;
            }
        }
    }

    // euclidean
    distance(initial, final) {
        return Math.max(Math.abs(initial.x - final.x), Math.abs(initial.y - final.y));
    }

    // A*
    findPath(initialPosition, finalPosition) {
        this.clearParentsFromMap();

        let openList = [];
        let closedList = [];

        initialPosition.h = this.distance(initialPosition, finalPosition);
        initialPosition.g = 0;
        initialPosition.f = initialPosition.g + initialPosition.h;

        openList.push(initialPosition);

        while (openList.length > 0) {
            let current = openList.reduce((best, candidate) => {
                return candidate.f < best.f ? candidate : best;
            });

            if (current.x === finalPosition.x && current.y === finalPosition.y) {
                // clear for next iterations
                clearCalculations();
                return reconstructPath(current);
            }

            const currentOpenIndex = openList.findIndex(spot => spot.x === current.x && spot.y === current.y);
            openList.splice(currentOpenIndex, 1);
            closedList.push(current);

            // map Neighbour to a list
            const neighbours = this.getNeighbours(current);
            let neighboursList = Object.keys(neighbours).reduce((neighbourList, direction) => {
                let neighbour = neighbours[direction];
                if (neighbour && neighbour.content === GRASS) {
                    neighbourList.push(neighbour);
                }
                return neighbourList;
            }, []);

            neighboursList.forEach(neighbour => {
                const isClosed = closedList.find(closedPosition => {
                    return (closedPosition.x === neighbour.x) && (closedPosition.y === neighbour.y);
                });

                if (isClosed) {
                    return;
                }

                const isOpen = openList.find(openPosition => {
                    return (openPosition.x === neighbour.x) && (openPosition.y === neighbour.y);
                });

                if (!isOpen) {
                    openList.push(neighbour);
                }

                let g = current.g + this.distance(current, neighbour);
                let h = this.distance(neighbour, finalPosition);
                let f = g + h;
                if (f >= neighbour.f) {
                    return;
                }

                if (f < neighbour.f || neighbour.f === undefined) {
                    neighbour.parent = current;
                    neighbour.g = g;
                    neighbour.f = f;
                }
            });
        }

        return [];

        // returns the final route (initial position as first)
        function reconstructPath(current) {
            let totalPath = [current];

            while (current.parent) {
                const parent = current.parent;
                delete current.parent;
                current = parent;
                totalPath.unshift(current);
            }

            return totalPath;
        }

        function clearCalculations() {
            openList.forEach(spot => {
                delete spot.f;
                delete spot.g;
                delete spot.h;

                if (spot.parent) {
                    delete spot.parent.f;
                    delete spot.parent.g;
                    delete spot.parent.h;
                }
            });

            closedList.forEach(spot => {
                delete spot.f;
                delete spot.g;
                delete spot.h;

                if (spot.parent) {
                    delete spot.parent.f;
                    delete spot.parent.g;
                    delete spot.parent.h;
                }
            });
        }

    }
}