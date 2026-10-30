import express from 'express';
import dotenv from 'dotenv';
import db from './db/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Dashboard: show all bookings and simple totals
app.get('/', async (req, res) => {
    try {
        const bookingsResult = await db.query(
            'SELECT * FROM bookings ORDER BY booking_date DESC, booking_time DESC'
        );

        const totalsResult = await db.query(`
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'Pending') AS pending,
                COUNT(*) FILTER (WHERE status = 'Completed') AS completed
            FROM bookings
        `);

        res.render('dashboard', {
            bookings: bookingsResult.rows,
            totals: totalsResult.rows[0]
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Could not load bookings. Check your database connection.');
    }
});

// Show an empty form for a new booking
app.get('/bookings/new', (req, res) => {
    res.render('booking-form', {
        booking: null,
        pageTitle: 'Add booking',
        formAction: '/bookings'
    });
});

// Save a new booking
app.post('/bookings', async (req, res) => {
    const { customer_name, customer_email, service, booking_date, booking_time, status } = req.body;

    if (!customer_name || !customer_email || !service || !booking_date || !booking_time || !status) {
        return res.status(400).send('Please complete all fields.');
    }

    try {
        await db.query(
            `INSERT INTO bookings
             (customer_name, customer_email, service, booking_date, booking_time, status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [customer_name, customer_email, service, booking_date, booking_time, status]
        );

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Could not save the booking.');
    }
});

// Show the form with the selected booking's details
app.get('/bookings/:id/edit', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT * FROM bookings WHERE id = $1',
            [req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).send('Booking not found.');
        }

        res.render('booking-form', {
            booking: result.rows[0],
            pageTitle: 'Edit booking',
            formAction: `/bookings/${req.params.id}/edit`
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Could not open the booking.');
    }
});

// Update an existing booking
app.post('/bookings/:id/edit', async (req, res) => {
    const { customer_name, customer_email, service, booking_date, booking_time, status } = req.body;

    if (!customer_name || !customer_email || !service || !booking_date || !booking_time || !status) {
        return res.status(400).send('Please complete all fields.');
    }

    try {
        const result = await db.query(
            `UPDATE bookings
             SET customer_name = $1,
                 customer_email = $2,
                 service = $3,
                 booking_date = $4,
                 booking_time = $5,
                 status = $6
             WHERE id = $7`,
            [customer_name, customer_email, service, booking_date, booking_time, status, req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('Booking not found.');
        }

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Could not update the booking.');
    }
});

// Delete a booking
app.post('/bookings/:id/delete', async (req, res) => {
    try {
        const result = await db.query(
            'DELETE FROM bookings WHERE id = $1',
            [req.params.id]
        );

        if (result.rowCount === 0) {
            return res.status(404).send('Booking not found.');
        }

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('Could not delete the booking.');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
