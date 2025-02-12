import express from 'express';
import multer from 'multer';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;

const client = new MongoClient(mongoUri);
let db;

client.connect().then(() => {
    db = client.db('dt-node-challenge');
    console.log('Connected to MongoDB');
}).catch(err => console.error('MongoDB connection error:', err));

app.use(express.json());
const storage = multer.memoryStorage(); 
const upload = multer({ storage });

// Get event by ID
app.get('/api/v3/app/events', async (req, res) => {
    try {
        const { id, type, limit, page } = req.query;
        const collection = db.collection('events');
        
        if (id) {
            const event = await collection.findOne({ _id: new ObjectId(id) });
            if (!event) return res.status(404).json({ message: 'Event not found' });
            return res.json(event);
        }
        
        if (type === 'latest') {
            const events = await collection.find().sort({ schedule: -1 }).limit(parseInt(limit)).skip((parseInt(page) - 1) * parseInt(limit)).toArray();
            return res.json(events);
        }

        res.status(400).json({ message: 'Invalid request parameters' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Post and event
app.post('/api/v3/app/events', upload.single('files[image]'), async (req, res) => {
    try {
        const { name, tagline, schedule, description, moderator, category, sub_category, rigor_rank } = req.body;
        const attendees = [];
        const image = req.file ? req.file.path : null;
        
        const event = { type: 'event', name, tagline, schedule, description, image, moderator, category, sub_category, rigor_rank: parseInt(rigor_rank), attendees };
        const result = await db.collection('events').insertOne(event);
        
        res.status(201).json({ eventId: result.insertedId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update an event
app.put('/api/v3/app/events/:id', upload.single('files[image]'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, tagline, schedule, description, moderator, category, sub_category, rigor_rank } = req.body;
        const image = req.file ? req.file.path : null;
        
        const updatedData = { name, tagline, schedule, description, moderator, category, sub_category, rigor_rank: parseInt(rigor_rank) };
        if (image) updatedData.image = image;
        
        const result = await db.collection('events').updateOne({ _id: new ObjectId(id) }, { $set: updatedData });
        if (result.matchedCount === 0) return res.status(404).json({ message: 'Event not found' });
        
        res.json({ message: 'Event updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete an event
app.delete('/api/v3/app/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.collection('events').deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) return res.status(404).json({ message: 'Event not found' });
        
        res.json({ message: 'Event deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

