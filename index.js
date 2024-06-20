const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const { Schema } = mongoose;
const bodyParser = require('body-parser');
require('dotenv').config();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

main().catch(err => console.log(err));

async function main() {
    await mongoose.connect(process.env.DB_URI);
}

const userSchema = new Schema({
    username: { type: String, require: true, unique: true },
    exercises: [{
        description: String,
        duration: Number,
        date: Date
    }]
}, { versionKey: false });

const User = mongoose.model('User', userSchema);
const ERROR = { error: "There was an error while getting the users." };

app.get('/api/users', async (req, res) => {
    try {
        const data = await User.find({});
        res.json(data);
    } catch (err) {
        res.send(ERROR);
    }
});

app.get('/api/users/:id/logs', (req, res) => {
    const id = req.params.id;
    const dateFrom = new Date(req.query.from);
    const dateTo = new Date(req.query.to);
    const limit = parseInt(req.query.limit);

    User.findOne({ _id: new ObjectId(id) })
        .then(data => {
            let log = [];

            data.exercises.filter(exercise =>
                new Date(Date.parse(exercise.date)).getTime() > dateFrom.getTime()
                && new Date(Date.parse(exercise.date)).getTime() < dateTo.getTime()
            );

            for (const exercise of data.exercises) {
                log.push({
                    description: exercise.description,
                    duration: exercise.duration,
                    date: new Date(exercise.date).toDateString()
                });
            }

            if (limit) log = log.slice(0, limit);

            res.json({
                _id: data._id,
                username: data.username,
                count: log.length,
                log: log
            });
        })
        .catch(err => {
            res.send(ERROR);
        });
});

app.post('/api/users', (req, res) => {
    const username = req.body.username;
    User.create({ username: username })
        .then(data => {
            res.json({ _id: data._id, username: data.username });
        })
        .catch(err => {
            res.send(ERROR);
        });
});

app.post('/api/users/:id/exercises', (req, res) => {
    const id = req.params.id;
    let { description, duration, date } = req.body;

    const newExercise = {
        description: description,
        duration: duration,
        date: date ? new Date(date).toDateString() : new Date().toDateString()
    };

    User.findOne({ _id: new ObjectId(id) })
        .then(data => {
            data.exercises.push(newExercise);
            return data.save();
        })
        .then(data => {
            const response = {
                username: data.username,
                description: data.exercises[data.exercises.length - 1].description,
                duration: data.exercises[data.exercises.length - 1].duration,
                date: new Date(data.exercises[data.exercises.length - 1].date).toDateString(),
                _id: data._id
            };

            res.json(response);
        })
        .catch(err => {
            res.send(ERROR);
        });
});

const listener = app.listen(process.env.PORT || 3000, () => {
    console.log('Your app is listening on port ' + listener.address().port);
});