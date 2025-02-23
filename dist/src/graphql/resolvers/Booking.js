import { BookingStatus } from "@prisma/client";
import { formatISO } from "date-fns";
cancelBooking: async (_parent, { id }, context) => {
    if (!context.user)
        throw new Error("Unauthorized");
    const booking = await context.prisma.booking.findUnique({ where: { id } });
    if (!booking)
        throw new Error("Booking not found");
    if (booking.userId !== context.user.id)
        throw new Error("You can only cancel your own bookings");
    // Update the booking status to CANCELED
    const canceledBooking = await context.prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELED },
    });
    // Notify the user
    await sendNotification(context.user.id, `Your booking (ID: ${canceledBooking.id}) has been successfully canceled.`);
    return {
        id: canceledBooking.id,
        status: canceledBooking.status,
        startDate: formatISO(new Date(canceledBooking.startDate)), // Convert to ISO format
        endDate: formatISO(new Date(canceledBooking.endDate)),
        pickupLocation: canceledBooking.pickupLocation,
        dropoffLocation: canceledBooking.dropoffLocation,
        totalPrice: canceledBooking.totalPrice,
        updatedAt: formatISO(new Date(canceledBooking.updatedAt)), // Convert to ISO format
    };
};
import { sendNotification } from "../../utils/notification.js";
export const bookingResolvers = {
    Query: {
        // ✅ Get all bookings (Admin only)
        getBookings: async (_parent, _args, context) => {
            if (!context.user || context.user.role !== "ADMIN") {
                throw new Error("Unauthorized. Only admins can view all bookings.");
            }
            const bookings = await context.prisma.booking.findMany({
                include: {
                    user: true, // Include user details
                    car: true, // Include car details
                },
            });
            return bookings.map((booking) => ({
                id: booking.id,
                status: booking.status,
                startDate: formatISO(new Date(booking.startDate)), // Convert to ISO
                endDate: formatISO(new Date(booking.endDate)), // Convert to ISO
                pickupLocation: booking.pickupLocation,
                dropoffLocation: booking.dropoffLocation,
                totalPrice: booking.totalPrice,
                updatedAt: formatISO(new Date(booking.updatedAt)), // Convert to ISO
                user: booking.user, // Include user details
                car: booking.car, // Include car details
            }));
        },
        // ✅ Get all bookings for the logged-in user
        getUserBookings: async (_parent, _args, context) => {
            if (!context.user)
                throw new Error("Unauthorized");
            const bookings = await context.prisma.booking.findMany({
                where: { userId: context.user.id },
                include: { car: true },
                orderBy: { startDate: "desc" },
            });
            return bookings.map((booking) => ({
                id: booking.id,
                status: booking.status,
                startDate: formatISO(new Date(booking.startDate)), // Convert to ISO
                endDate: formatISO(new Date(booking.endDate)), // Convert to ISO
                pickupLocation: booking.pickupLocation,
                dropoffLocation: booking.dropoffLocation,
                totalPrice: booking.totalPrice,
                updatedAt: formatISO(new Date(booking.updatedAt)), // Convert to ISO
                car: booking.car, // Include car details
            }));
        },
        // ✅ Get a single booking by ID
        getBooking: async (_parent, { id }, context) => {
            if (!context.user)
                throw new Error("Unauthorized");
            const booking = await context.prisma.booking.findUnique({
                where: { id },
                include: {
                    user: true,
                    car: true,
                },
            });
            if (!booking)
                throw new Error("Booking not found");
            if (context.user.role !== "ADMIN" && booking.userId !== context.user.id) {
                throw new Error("You can only view your own bookings.");
            }
            return {
                id: booking.id,
                status: booking.status,
                startDate: formatISO(new Date(booking.startDate)), // Convert to ISO
                endDate: formatISO(new Date(booking.endDate)), // Convert to ISO
                pickupLocation: booking.pickupLocation,
                dropoffLocation: booking.dropoffLocation,
                totalPrice: booking.totalPrice,
                updatedAt: formatISO(new Date(booking.updatedAt)), // Convert to ISO
                user: booking.user, // Include user details
                car: booking.car, // Include car details
            };
        },
    },
    Mutation: {
        // ✅ Create a booking
        createBooking: async (_parent, { carId, startDate, endDate, pickupLocation, dropoffLocation, }, context) => {
            if (!context.user)
                throw new Error("Unauthorized");
            const car = await context.prisma.car.findUnique({ where: { id: carId } });
            if (!car)
                throw new Error("Car not found");
            if (!car.availability)
                throw new Error("Car is not available for booking");
            const start = new Date(startDate);
            const end = new Date(endDate);
            const today = new Date();
            if (start < today)
                throw new Error("Start date cannot be in the past");
            if (start >= end)
                throw new Error("End date must be after start date");
            // Check for overlapping bookings
            const overlappingBooking = await context.prisma.booking.findFirst({
                where: {
                    carId,
                    status: { notIn: [BookingStatus.CANCELED, BookingStatus.COMPLETED] },
                    OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
                },
            });
            if (overlappingBooking) {
                throw new Error("Car is already booked for the selected dates");
            }
            // Calculate total price
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
            const totalPrice = car.price * days;
            // Create new booking with relations
            const booking = await context.prisma.booking.create({
                data: {
                    userId: context.user.id,
                    carId,
                    startDate: start,
                    endDate: end,
                    pickupLocation,
                    dropoffLocation,
                    totalPrice,
                    status: BookingStatus.PENDING,
                },
                include: {
                    user: true, // Ensure the user is included in the response
                    car: true, // Ensure the car is included as well
                },
            });
            // Notify user
            await sendNotification(context.user.id, `Your booking is pending confirmation.`);
            return {
                ...booking,
                startDate: booking.startDate.toISOString(),
                endDate: booking.endDate.toISOString(),
            };
        },
        // ✅ Update a booking (Admin only)
        updateBooking: async (_parent, { id, status }, context) => {
            if (!context.user || context.user.role !== "ADMIN") {
                throw new Error("Only admins can update bookings.");
            }
            if (!Object.values(BookingStatus).includes(status)) {
                throw new Error("Invalid booking status.");
            }
            const booking = await context.prisma.booking.findUnique({ where: { id } });
            if (!booking)
                throw new Error("Booking not found");
            // **Ensure only valid status updates are allowed**
            const validTransitions = {
                [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELED],
                [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELED],
                [BookingStatus.CANCELED]: [],
                [BookingStatus.COMPLETED]: [],
            };
            if (booking.status !== status &&
                !validTransitions[booking.status]?.includes(status)) {
                throw new Error(`Cannot change booking status from ${booking.status} to ${status}`);
            }
            const updatedBooking = await context.prisma.booking.update({
                where: { id },
                data: { status },
            });
            // **Notify user about status update**
            await sendNotification(booking.userId, `Your booking status has been updated to: ${status}`);
            return updatedBooking;
        },
        // ✅ Cancel a booking (User only)
        cancelBooking: async (_parent, { id }, context) => {
            if (!context.user)
                throw new Error("Unauthorized");
            const booking = await context.prisma.booking.findUnique({ where: { id } });
            if (!booking)
                throw new Error("Booking not found");
            if (booking.userId !== context.user.id)
                throw new Error("You can only cancel your own bookings");
            // Update the booking status to CANCELED
            const canceledBooking = await context.prisma.booking.update({
                where: { id },
                data: { status: BookingStatus.CANCELED },
            });
            // Notify the user
            await sendNotification(context.user.id, `Your booking (ID: ${canceledBooking.id}) has been successfully canceled.`);
            return {
                id: canceledBooking.id,
                status: canceledBooking.status,
                startDate: formatISO(new Date(canceledBooking.startDate)),
                endDate: formatISO(new Date(canceledBooking.endDate)),
                pickupLocation: canceledBooking.pickupLocation,
                dropoffLocation: canceledBooking.dropoffLocation,
                totalPrice: canceledBooking.totalPrice,
                updatedAt: formatISO(new Date(canceledBooking.updatedAt)),
            };
        },
    },
};
