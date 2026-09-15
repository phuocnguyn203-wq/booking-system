import cors from 'cors'
import express from 'express'
import JwtAdapter from './app/adapters/jwt.adapter.js'
import PasswordHasherAdapter from './app/adapters/passwordHasher.adapter.js'
import AuthController from './app/controllers/auth.controller.js'
import BookingsController from './app/controllers/bookings.controller.js'
import PaymentsController from './app/controllers/payments.controller.js'
import RolesController from './app/controllers/roles.controller.js'
import RoomsController from './app/controllers/rooms.controller.js'
import UserRolesController from './app/controllers/userRoles.controller.js'
import UsersController from './app/controllers/users.controller.js'
import createAuthenticate from './app/middleware/authenticate.middleware.js'
import createErrorHandler from './app/middleware/errorHandler.middleware.js'
import notFound from './app/middleware/notFound.middleware.js'
import BookingRepository from './app/repositories/bookings.repository.js'
import PaymentRepository from './app/repositories/payments.repository.js'
import RoleRepository from './app/repositories/roles.repository.js'
import RoomRepository from './app/repositories/rooms.repository.js'
import UserRoleRepository from './app/repositories/userRoles.repository.js'
import UserRepository from './app/repositories/users.repository.js'
import createAuthRouter from './app/routes/auth.routes.js'
import createBookingsRouter from './app/routes/bookings.routes.js'
import createPaymentsRouter from './app/routes/payments.routes.js'
import createRolesRouter from './app/routes/roles.routes.js'
import createRoomsRouter from './app/routes/rooms.routes.js'
import createUserRolesRouter from './app/routes/userRoles.routes.js'
import createUsersRouter from './app/routes/users.routes.js'
import AuthService from './app/services/auth.service.js'
import BookingService from './app/services/bookings.service.js'
import PaymentService from './app/services/payments.service.js'
import RoleService from './app/services/roles.service.js'
import RoomService from './app/services/rooms.service.js'
import TokenService from './app/services/token.service.js'
import UserRoleService from './app/services/userRoles.service.js'
import UserService from './app/services/users.service.js'

function createCorsOptions(allowedOrigins) {
  const allowedOriginSet = new Set(allowedOrigins)

  return {
    credentials: true,
    origin(origin, callback) {
      // Requests without Origin include server-to-server calls and local health
      // checks. Browsers still require an exact configured origin to read data.
      callback(null, origin === undefined || allowedOriginSet.has(origin))
    }
  }
}

export default function createApp({
  config,
  query,
  logger = console,
  passwordHasher = new PasswordHasherAdapter(),
  jwtAdapter = new JwtAdapter()
}) {
  if (typeof query !== 'function')
    throw new TypeError('createApp requires a database query function')

  const userRepository = new UserRepository(query)
  const roomRepository = new RoomRepository(query)
  const roleRepository = new RoleRepository(query)
  const bookingRepository = new BookingRepository(query)
  const paymentRepository = new PaymentRepository(query)
  const userRoleRepository = new UserRoleRepository(query)

  const tokenService = new TokenService({
    jwt: jwtAdapter,
    secret: config.jwtSecret,
    accessTokenExpiresIn: config.accessTokenExpiresIn,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience
  })
  const userService = new UserService({ userRepository, passwordHasher })
  const roomService = new RoomService({ roomRepository })
  const roleService = new RoleService({ roleRepository })
  const bookingService = new BookingService({ bookingRepository })
  const paymentService = new PaymentService({ paymentRepository })
  const userRoleService = new UserRoleService({
    userRepository,
    roleRepository,
    userRoleRepository
  })
  const authService = new AuthService({
    userRepository,
    userRoleRepository,
    passwordHasher,
    tokenService
  })

  const authController = new AuthController({ authService })
  const usersController = new UsersController({ userService })
  const roomsController = new RoomsController({ roomService })
  const rolesController = new RolesController({ roleService })
  const bookingsController = new BookingsController({ bookingService })
  const paymentsController = new PaymentsController({ paymentService })
  const userRolesController = new UserRolesController({ userRoleService })
  const authenticate = createAuthenticate({ authService })

  const app = express()
  app.disable('x-powered-by')
  app.use(cors(createCorsOptions(config.corsOrigins)))
  app.use(express.json({ limit: '100kb' }))

  app.get('/api/health', (req, res) => {
    return res.status(200).json({ data: { status: 'ok' } })
  })
  app.use('/api/auth', createAuthRouter({ authController }))
  app.use('/api/users', createUsersRouter({ usersController, authenticate }))
  app.use('/api/users', createUserRolesRouter({
    userRolesController,
    authenticate
  }))
  app.use('/api/rooms', createRoomsRouter({ roomsController, authenticate }))
  app.use('/api/roles', createRolesRouter({ rolesController, authenticate }))
  app.use('/api/bookings', createBookingsRouter({
    bookingsController,
    authenticate
  }))
  app.use('/api/payments', createPaymentsRouter({
    paymentsController,
    authenticate
  }))

  app.use(notFound)
  app.use(createErrorHandler({ logger }))

  return app
}
