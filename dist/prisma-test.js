import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    // Test user creation
    const newUser = await prisma.user.create({
        data: {
            fullName: 'John Doe',
            email: 'johndoe@example.com',
            phoneNumber: '1234567890',
            address: '123 Main St, City, Country',
            driversLicense: 'AB12345CD',
            password: 'hashed_password', // Placeholder for hashed password
        },
    });
    console.log('New user created:', newUser);
    // Test retrieving all users
    const users = await prisma.user.findMany();
    console.log('All users:', users);
    // Test finding a user by email
    const user = await prisma.user.findUnique({
        where: {
            email: 'johndoe@example.com',
        },
    });
    console.log('User found:', user);
    // Test updating user phone number
    const updatedUser = await prisma.user.update({
        where: {
            email: 'johndoe@example.com',
        },
        data: {
            phoneNumber: '0987654321',
        },
    });
    console.log('Updated user:', updatedUser);
    // Test deleting user
    const deletedUser = await prisma.user.delete({
        where: {
            email: 'johndoe@example.com',
        },
    });
    console.log('Deleted user:', deletedUser);
}
// Run the main function
main()
    .catch(e => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
