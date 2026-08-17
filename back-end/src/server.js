import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ObjectId } from 'mongodb';
import { getDb } from './db.js';

const app = express();
const port = process.env.PORT || 10000;

// =========================
// Middleware
// =========================
app.use(
  cors({
    origin: process.env.FRONTEND_URL || '*',
  })
);

app.use(express.json({ limit: '1mb' }));

// =========================
// Authentication
// =========================
function auth(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;

  const provided = (req.headers.authorization || '').replace(
    /^Bearer\s+/,
    ''
  );

  if (!expected || provided !== expected) {
    return res.status(401).json({
      error: 'Unauthorized',
    });
  }

  next();
}

// =========================
// MongoDB helpers
// =========================
async function col(name) {
  const db = await getDb();
  return db.collection(name);
}

function oid(id) {
  return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

// =========================
// Health check
// =========================
app.get('/health', async (_, res) => {
  try {
    await getDb();

    res.json({
      status: 'ok',
      database: 'connected',
    });
  } catch (e) {
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      error: e.message,
    });
  }
});

// =========================
// Public APIs
// =========================

// Get published jobs
app.get('/api/jobs', async (_, res) => {
  try {
    const jobs = await (
      await col('jobs')
    )
      .find({
        published: { $ne: false },
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.json({
      data: jobs,
      source: 'mongodb',
    });
  } catch (e) {
    res.status(500).json({
      data: [],
      error: e.message,
    });
  }
});

// Get published posts
app.get('/api/posts', async (_, res) => {
  try {
    const posts = await (
      await col('posts')
    )
      .find({
        published: { $ne: false },
      })
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.json({
      data: posts,
      source: 'mongodb',
    });
  } catch (e) {
    res.status(500).json({
      data: [],
      error: e.message,
    });
  }
});

// Create application
app.post('/api/applications', async (req, res) => {
  try {
    const result = await (
      await col('applications')
    ).insertOne({
      ...req.body,
      createdAt: new Date(),
    });

    res.status(201).json({
      ok: true,
      id: result.insertedId,
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
    });
  }
});

// =========================
// Admin authentication
// =========================

app.post('/api/admin/verify', auth, (_, res) => {
  res.json({
    ok: true,
  });
});

// =========================
// Admin - Posts
// =========================

// Get all posts
app.get('/api/admin/posts', auth, async (_, res) => {
  try {
    const posts = await (
      await col('posts')
    )
      .find()
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.json({
      data: posts,
    });
  } catch (e) {
    res.status(500).json({
      data: [],
      error: e.message,
    });
  }
});

// Create post
app.post('/api/admin/posts', auth, async (req, res) => {
  try {
    const result = await (
      await col('posts')
    ).insertOne({
      ...req.body,
      createdAt: new Date(),
    });

    res.status(201).json({
      ok: true,
      id: result.insertedId,
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
    });
  }
});

// =========================
// Admin - Jobs
// =========================

// Get all jobs
app.get('/api/admin/jobs', auth, async (_, res) => {
  try {
    const jobs = await (
      await col('jobs')
    )
      .find()
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.json({
      data: jobs,
    });
  } catch (e) {
    res.status(500).json({
      data: [],
      error: e.message,
    });
  }
});

// Create job
app.post('/api/admin/jobs', auth, async (req, res) => {
  try {
    const result = await (
      await col('jobs')
    ).insertOne({
      ...req.body,
      createdAt: new Date(),
    });

    res.status(201).json({
      ok: true,
      id: result.insertedId,
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
    });
  }
});

// =========================
// Admin - Posts & Jobs
// Update / Delete
// =========================

for (const type of ['posts', 'jobs']) {
  // Update
  app.put(`/api/admin/${type}/:id`, auth, async (req, res) => {
    try {
      const id = oid(req.params.id);

      if (!id) {
        return res.status(400).json({
          error: 'Invalid id',
        });
      }

      const result = await (
        await col(type)
      ).updateOne(
        {
          _id: id,
        },
        {
          $set: {
            ...req.body,
            updatedAt: new Date(),
          },
        }
      );

      res.json({
        ok: true,
        modified: result.modifiedCount,
      });
    } catch (e) {
      res.status(500).json({
        error: e.message,
      });
    }
  });

  // Delete
  app.delete(`/api/admin/${type}/:id`, auth, async (req, res) => {
    try {
      const id = oid(req.params.id);

      if (!id) {
        return res.status(400).json({
          error: 'Invalid id',
        });
      }

      const result = await (
        await col(type)
      ).deleteOne({
        _id: id,
      });

      res.json({
        ok: true,
        deleted: result.deletedCount,
      });
    } catch (e) {
      res.status(500).json({
        error: e.message,
      });
    }
  });
}

// =========================
// Admin - Applications
// =========================

app.get('/api/admin/applications', auth, async (_, res) => {
  try {
    const applications = await (
      await col('applications')
    )
      .find()
      .sort({
        createdAt: -1,
      })
      .toArray();

    res.json({
      data: applications,
    });
  } catch (e) {
    res.status(500).json({
      data: [],
      error: e.message,
    });
  }
});

// =========================
// Admin - Logo
// =========================

// Get logo
app.get('/api/admin/settings/logo', auth, async (_, res) => {
  try {
    const logo = await (
      await col('settings')
    ).findOne({
      _id: 'logo',
    });

    res.json({
      data: logo,
    });
  } catch (e) {
    res.status(500).json({
      data: null,
      error: e.message,
    });
  }
});

// Update logo
app.put('/api/admin/settings/logo', auth, async (req, res) => {
  try {
    await (
      await col('settings')
    ).updateOne(
      {
        _id: 'logo',
      },
      {
        $set: {
          url: req.body.url,
          updatedAt: new Date(),
        },
      },
      {
        upsert: true,
      }
    );

    res.json({
      ok: true,
    });
  } catch (e) {
    res.status(500).json({
      error: e.message,
    });
  }
});

// =========================
// Start server
// =========================

app.listen(port, () => {
  console.log(`SPG backend listening on ${port}`);
});