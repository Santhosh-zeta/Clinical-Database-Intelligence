'use strict';

require('dotenv').config();
const axios = require('axios');
const chalk = require('chalk');
const { Client } = require("@googlemaps/google-maps-services-js");
const polyline = require('@mapbox/polyline');

const API = process.env.API_URL || 'http://localhost:3001';
const GOOGLE_KEY = "AIzaSyCUC5A83kBQjgZDiZKrtuCgy4cOveuHKTQ";
const INTERVAL = 3000;
const api = axios.create({ baseURL: API, timeout: 5000 });
const googleClient = new Client({});

const HOSPITAL_POS = { lat: 12.9716, lng: 77.5946 };

const activeRoutes = new Map();

async function login() {
    try {
        const res = await api.post('/api/auth/login', {
            email: 'a1@intellicare.demo',
            password: 'password123'
        });
        const token = res.data.token;
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        return token;
    } catch (err) {
        console.error(chalk.red(' ✗ Auth failed:'), err.message);
        process.exit(1);
    }
}

async function fetchRoute(origin, dest) {
    try {
        const resp = await googleClient.directions({
            params: {
                origin,
                destination: dest,
                key: GOOGLE_KEY,
                mode: 'driving'
            }
        });

        if (resp.data.status !== 'OK') return null;

        const points = [];
        const route = resp.data.routes[0].legs[0];
        route.steps.forEach(step => {
            const decoded = polyline.decode(step.polyline.points);
            decoded.forEach(p => points.push({ lat: p[0], lng: p[1] }));
        });

        return {
            points,
            distanceText: route.distance.text,
            durationText: route.duration.text
        };
    } catch {
        return null;
    }
}

async function start() {
    console.log(chalk.bold.blue('\n🚑 High-Fidelity Fleet Simulator — "On-Road" Protocol\n'));

    await login();
    console.log(chalk.green(' ✓ Backend Connection: OK'));
    console.log(chalk.green(' ✓ Google Roads Engine: OK\n'));

    const res = await api.get('/api/ambulances');
    let fleet = res.data.data;

    setInterval(async () => {
        for (let unit of fleet) {

            if (unit.status === 'Available') {
                if (Math.random() > 0.9) {

                    unit.status = 'Inbound';
                    unit.patient = 'Emergency - Acute Cardiac';
                    const startLat = HOSPITAL_POS.lat + (Math.random() - 0.5) * 0.1;
                    const startLng = HOSPITAL_POS.lng + (Math.random() - 0.5) * 0.1;
                    unit.lat = startLat;
                    unit.lng = startLng;
                    activeRoutes.delete(unit.id);
                }
            }

            if ((unit.status === 'Inbound' || unit.status === 'Returning' || unit.status === 'Dispatched') && !activeRoutes.has(unit.id)) {
                console.log(chalk.gray(` [${unit.id}] Requesting road-following path...`));
                const routeData = await fetchRoute({ lat: unit.lat, lng: unit.lng }, HOSPITAL_POS);
                if (routeData) {
                    activeRoutes.set(unit.id, { ...routeData, stepIndex: 0 });
                }
            }

            const route = activeRoutes.get(unit.id);
            if (route) {

                const speedFactor = unit.status === 'Inbound' ? 4 : 2;
                route.stepIndex += speedFactor;

                if (route.stepIndex < route.points.length) {
                    const nextPoint = route.points[route.stepIndex];
                    unit.lat = nextPoint.lat;
                    unit.lng = nextPoint.lng;
                    unit.dist = route.distanceText;
                    unit.eta = route.durationText;
                    unit.speed = unit.status === 'Inbound' ? '70 km/h' : '45 km/h';

                    if (unit.eta === '2 mins' && unit.status === 'Inbound' && !unit.notifiedNear) {
                        unit.notifiedNear = true;
                        api.post('/notifications', {
                            doctor_id: 1,
                            message: `🚨 AMBULANCE ${unit.id} is 2 mins away with ${unit.patient}`,
                            type: 'ambulance'
                        }).catch(() => { });
                    }
                } else {

                    if (unit.status === 'Inbound') {
                        api.post('/notifications', {
                            doctor_id: 1,
                            message: `✅ AMBULANCE ${unit.id} has arrived at Hospital`,
                            type: 'ambulance'
                        }).catch(() => { });
                    }
                    unit.status = 'Available';
                    unit.lat = HOSPITAL_POS.lat;
                    unit.lng = HOSPITAL_POS.lng;
                    unit.dist = '--';
                    unit.eta = '--';
                    unit.speed = '0 km/h';
                    unit.patient = '--';
                    unit.notifiedNear = false;
                    activeRoutes.delete(unit.id);
                }
            }

            try {
                await api.put(`/api/ambulances/${unit.id}/telemetry`, {
                    lat: unit.lat,
                    lng: unit.lng,
                    status: unit.status,
                    speed: unit.speed,
                    eta: unit.eta,
                    dist: unit.dist,
                    patient: unit.patient
                });
            } catch (err) {
                console.error(` [${unit.id}] Sync fail: ${err.message}`);
            }
        }

        process.stdout.write('\x1Bc');
        console.log(chalk.bold.gray(`  Fleet Telemetry Hub  |  ${new Date().toLocaleTimeString()}  |  Road Match Enabled\n`));
        fleet.forEach(u => {
            const color = u.status === 'Inbound' || u.status === 'Dispatched' ? chalk.red : u.status === 'Available' ? chalk.green : chalk.blue;
            const routeInfo = activeRoutes.has(u.id) ? chalk.gray(`(Step: ${activeRoutes.get(u.id).stepIndex}/${activeRoutes.get(u.id).points.length})`) : '';
            console.log(
                ` ${chalk.bold(u.id.padEnd(8))} | ${color(u.status.padEnd(12))} | ETA: ${u.eta.padEnd(10)} | Pos: ${Number(u.lat).toFixed(4)}, ${Number(u.lng).toFixed(4)} ${routeInfo}`
            );
        });
        console.log(chalk.gray('\n Active Missions in Progress...'));

    }, INTERVAL);
}

start().catch(err => console.error(chalk.red('FATAL ENGINE ERROR:'), err));
