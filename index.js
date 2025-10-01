const express = require('express');
const app = express();
const cors = require("cors");
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion } = require('mongodb');
require("dotenv").config();
const { ObjectId } = require('mongodb');

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.8k7klrr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    await client.connect();
    const ClusterConnect = client.db("ClusterConnect");
    const ClusterConnectCollection = ClusterConnect.collection("taskess");

    app.post('/add-task', async (req, res) => {
      const NewTask = req.body;
      const result = await ClusterConnectCollection.insertOne(NewTask);
      res.send(result);
    });

    app.get('/browse-tasks', async (req, res) => {
      try {
        const tasks = await ClusterConnectCollection.find({}).toArray();
        res.json(tasks);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).send('Error fetching tasks');
      }
    });

    app.get('/browse-tasks/:id', async (req, res) => {
      const { id } = req.params;
      try {
        if (!ObjectId.isValid(id)) {
          return res.status(400).send('Invalid task ID');
        }
        const task = await ClusterConnectCollection.findOne({ _id: new ObjectId(id) });
        if (!task) {
          return res.status(404).send('Task not found');
        }
        res.json(task);
      } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching task details');
      }
    });

    app.get('/featured-tasks', async (req, res) => {
      try {
        const featuredTasks = await ClusterConnectCollection.find().sort({ deadline: 1 }).limit(6).toArray();
        res.json(featuredTasks);
      } catch (error) {
        console.error(error);
        res.status(500).send('Error fetching featured tasks');
      }
    });

    app.get('/my-posted-task', async (req, res) => {
      const { userEmail } = req.query;
      if (!userEmail) return res.status(400).send('Missing user email');
      const tasks = await ClusterConnectCollection.find({ userEmail }).sort({ deadline: -1 }).toArray();
      res.json(tasks);
    });

    app.post('/tasks/:id/bid', async (req, res) => {
      const { id } = req.params;
      try {
        const updateResult = await ClusterConnectCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $inc: { bids: 1 } },
          { returnDocument: 'after' }
        );

        if (!updateResult.value) {
          return res.status(404).send('Task not found');
        }
        const updatedTask = { ...updateResult.value };
        res.json(updatedTask);
      } catch (err) {
        console.error(err);
        res.status(500).send('Error placing bid');
      }
    });

    app.get('/tasks/:id/bids', async (req, res) => {
      const { id } = req.params;
      try {
        const task = await ClusterConnectCollection.findOne({ _id: new ObjectId(id) });
        if (!task) {
          return res.status(404).send('Task not found');
        }
        res.json({ bids: task.bids });
      } catch (err) {
        res.status(500).send('Error fetching bids');
      }
    });

    app.get('/tasks/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid task ID format' });
      }
      try {
        const task = await ClusterConnectCollection.findOne({ _id: new ObjectId(id) });
        if (!task) {
          return res.status(404).json({ error: 'Task not found' });
        }
        res.json({ ...task, _id: task._id.toString() });
      } catch (error) {
        console.error('Error fetching task:', error);
        res.status(500).json({ error: 'Failed to fetch task' });
      }
    });

    app.put('/tasks/:id', async (req, res) => {
      const { id } = req.params;
      const updatedTaskData = req.body;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid task ID format' });
      }
      const { _id, ...updateFields } = updatedTaskData;
      try {
        const result = await ClusterConnectCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updateFields }
        );
        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Task not found' });
        }
        res.json(result);
      } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ error: 'Failed to update task' });
      }
    });

    app.delete('/tasks/:id', async (req, res) => {
      const { id } = req.params;
      if (!ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'Invalid task ID format' });
      }
      try {
        const result = await ClusterConnectCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
          return res.status(404).json({ error: 'Task not found' });
        }
        res.json(result);
      } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
      }
    });

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {}
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Cluster Connect Server Home page");
});

app.listen(port, () => {
  console.log(`Cluster Connect server is running on port ${port}`);
});
