import { BookingStatus, PrismaClient } from "@prisma/client";
import { Context } from "../../types/types.js";
import { formatISO } from "date-fns";
import { sendNotification } from "../../utils/notification.js";
import { GraphQLError } from "graphql";

const prisma = new PrismaClient();

// Centralized activity logging helper
async function logActivity(userId: string, action: string, resourceType?: string, resourceId?: string) {
  await prisma.activityLog.create({
    data: {
      userId,
      action,
      resourceType,
      resourceId,
    },
  });
}

export const bookingResolvers = {
  Query: {
    getBookings: async (_parent: unknown, _args: unknown, context: Context) => {
      if (!context.user || (context.user.role !== "ADMIN" && context.user.role !== "STAFF")) {
        throw new GraphQLError("Unauthorized. Only admins and staff can view all bookings.", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      const bookings = await context.prisma.booking.findMany({
        include: {
          user: true,
          car: true,
        },
      });

      return bookings.map((booking) => ({
        id: booking.id,
        status: booking.status,
        startDate: formatISO(new Date(booking.startDate)),
        endDate: formatISO(new Date(booking.endDate)),
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        totalPrice: booking.totalPrice,
        updatedAt: formatISO(new Date(booking.updatedAt)),
        user: booking.user,
        car: booking.car,
      }));
    },

    getUserBookings: async (_parent: unknown, _args: unknown, context: Context) => {
      if (!context.user) {
        throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });
      }

      const bookings = await context.prisma.booking.findMany({
        where: { userId: context.user.id },
        include: { car: true },
        orderBy: { startDate: "desc" },
      });

      return bookings.map((booking) => ({
        id: booking.id,
        status: booking.status,
        startDate: formatISO(new Date(booking.startDate)),
        endDate: formatISO(new Date(booking.endDate)),
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        totalPrice: booking.totalPrice,
        updatedAt: formatISO(new Date(booking.updatedAt)),
        car: booking.car,
      }));
    },

    getBooking: async (_parent: unknown, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });
      }

      const booking = await context.prisma.booking.findUnique({
        where: { id },
        include: {
          user: true,
          car: true,
        },
      });

      if (!booking) {
        throw new GraphQLError("Booking not found", { extensions: { code: "NOT_FOUND" } });
      }

      if (context.user.role !== "ADMIN" && context.user.role !== "STAFF" && booking.userId !== context.user.id) {
        throw new GraphQLError("You can only view your own bookings.", { extensions: { code: "FORBIDDEN" } });
      }

      return {
        id: booking.id,
        status: booking.status,
        startDate: formatISO(new Date(booking.startDate)),
        endDate: formatISO(new Date(booking.endDate)),
        pickupLocation: booking.pickupLocation,
        dropoffLocation: booking.dropoffLocation,
        totalPrice: booking.totalPrice,
        updatedAt: formatISO(new Date(booking.updatedAt)),
        user: booking.user,
        car: booking.car,
      };
    },
  },

  Mutation: {
    createBooking: async (
      _parent: unknown,
      {
        carId,
        startDate,
        endDate,
        pickupLocation,
        dropoffLocation,
      }: { carId: string; startDate: string; endDate: string; pickupLocation: string; dropoffLocation: string },
      context: Context
    ) => {
      if (!context.user) {
        throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });
      }

      const car = await context.prisma.car.findUnique({ where: { id: carId } });
      if (!car) {
        throw new GraphQLError("Car not found", { extensions: { code: "NOT_FOUND" } });
      }
      if (!car.availability) {
        throw new GraphQLError("Car is not available for booking", { extensions: { code: "BAD_REQUEST" } });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const today = new Date();

      if (start < today) {
        throw new GraphQLError("Start date cannot be in the past", { extensions: { code: "BAD_REQUEST" } });
      }
      if (start >= end) {
        throw new GraphQLError("End date must be after start date", { extensions: { code: "BAD_REQUEST" } });
      }

      const overlappingBooking = await context.prisma.booking.findFirst({
        where: {
          carId,
          status: { notIn: [BookingStatus.CANCELED, BookingStatus.COMPLETED] },
          OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
        },
      });

      if (overlappingBooking) {
        throw new GraphQLError("Car is already booked for the selected dates", {
          extensions: { code: "BAD_REQUEST" },
        });
      }

      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const totalPrice = Number(car.price) * days;

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
          user: true,
          car: true,
        },
      });

      // Log the action
      await logActivity(context.user.id, `Created booking for car: ${car.make} ${car.model}`, "Booking", booking.id);

      await sendNotification(context.user.id, `Your booking is pending confirmation.`);

      return {
        ...booking,
        startDate: booking.startDate.toISOString(),
        endDate: booking.endDate.toISOString(),
      };
    },

    updateBooking: async (
      _parent: unknown,
      { id, status }: { id: string; status: BookingStatus },
      context: Context
    ) => {
      if (!context.user || (context.user.role !== "ADMIN" && context.user.role !== "STAFF")) {
        throw new GraphQLError("Only admins and staff can update bookings.", {
          extensions: { code: "FORBIDDEN" },
        });
      }

      if (!Object.values(BookingStatus).includes(status)) {
        throw new GraphQLError("Invalid booking status.", { extensions: { code: "BAD_REQUEST" } });
      }

      const booking = await context.prisma.booking.findUnique({ where: { id } });
      if (!booking) {
        throw new GraphQLError("Booking not found", { extensions: { code: "NOT_FOUND" } });
      }

      const validTransitions: Record<BookingStatus, BookingStatus[]> = {
        [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELED],
        [BookingStatus.CONFIRMED]: [BookingStatus.COMPLETED, BookingStatus.CANCELED],
        [BookingStatus.CANCELED]: [],
        [BookingStatus.COMPLETED]: [],
      };

      if (booking.status !== status && !validTransitions[booking.status]?.includes(status)) {
        throw new GraphQLError(`Cannot change booking status from ${booking.status} to ${status}`, {
          extensions: { code: "BAD_REQUEST" },
        });
      }

      const updatedBooking = await context.prisma.booking.update({
        where: { id },
        data: { status },
      });

      // Log the action
      await logActivity(
        context.user.id,
        `Updated booking status to ${status}`,
        "Booking",
        updatedBooking.id
      );

      await sendNotification(booking.userId, `Your booking status has been updated to: ${status}`);

      return updatedBooking;
    },

    cancelBooking: async (_parent: unknown, { id }: { id: string }, context: Context) => {
      if (!context.user) {
        throw new GraphQLError("Unauthorized", { extensions: { code: "UNAUTHORIZED" } });
      }

      const booking = await context.prisma.booking.findUnique({ where: { id } });
      if (!booking) {
        throw new GraphQLError("Booking not found", { extensions: { code: "NOT_FOUND" } });
      }

      if (booking.userId !== context.user.id) {
        throw new GraphQLError("You can only cancel your own bookings", { extensions: { code: "FORBIDDEN" } });
      }

      const canceledBooking = await context.prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.CANCELED },
      });

      // Log the action
      await logActivity(context.user.id, "Canceled booking", "Booking", canceledBooking.id);

      await sendNotification(
        context.user.id,
        `Your booking (ID: ${canceledBooking.id}) has been successfully canceled.`
      );

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