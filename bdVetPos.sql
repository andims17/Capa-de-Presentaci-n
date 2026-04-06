------------------------------------------------------------
-- Crear Base de Datos
------------------------------------------------------------
IF DB_ID('VetPostDB') IS NULL       
    CREATE DATABASE VetPostDB;
GO

USE VetPostDB;
GO

------------------------------------------------------------
-- TABLA: ROLES
------------------------------------------------------------
CREATE TABLE Roles (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(50) NOT NULL UNIQUE
);

------------------------------------------------------------
-- TABLA: USUARIOS
------------------------------------------------------------
CREATE TABLE Usuarios (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Username VARCHAR(50) NOT NULL UNIQUE,
    NombreCompleto VARCHAR(150) NOT NULL,
    Email VARCHAR(150) NOT NULL UNIQUE,
    Telefono VARCHAR(30),
    PasswordHash VARCHAR(255) NOT NULL,
    RolId INT NOT NULL,
    Activo BIT DEFAULT 1,
    UltimoAcceso DATETIME NULL,

    FOREIGN KEY (RolId) REFERENCES Roles(Id)
);

------------------------------------------------------------
-- TABLA: CLIENTES
------------------------------------------------------------
CREATE TABLE Clientes (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    NombreCompleto VARCHAR(150) NOT NULL,
    Email VARCHAR(150),
    Telefono VARCHAR(30),
    Direccion VARCHAR(200)
);

------------------------------------------------------------
-- TABLA: MASCOTAS
------------------------------------------------------------
CREATE TABLE Mascotas (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ClienteId INT NOT NULL,
    Nombre VARCHAR(100) NOT NULL,
    Especie VARCHAR(50),
    Raza VARCHAR(50),
    Sexo VARCHAR(10),
    FechaNacimiento DATE,

    FOREIGN KEY (ClienteId) REFERENCES Clientes(Id)
);

------------------------------------------------------------
-- TABLA: CITAS
------------------------------------------------------------
CREATE TABLE Citas (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    MascotaId INT NOT NULL,
    UsuarioId INT NOT NULL,       -- Veterinario / usuario asignado
    Fecha DATE NOT NULL,
    Hora TIME NOT NULL,
    Servicio VARCHAR(100) NOT NULL,
    Estado VARCHAR(20) DEFAULT 'Pendiente',

    FOREIGN KEY (MascotaId) REFERENCES Mascotas(Id),
    FOREIGN KEY (UsuarioId) REFERENCES Usuarios(Id)
);

------------------------------------------------------------
-- TABLA: CATEGORIAS DE PRODUCTOS
------------------------------------------------------------
CREATE TABLE Categorias (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Descripcion VARCHAR(200)
);

------------------------------------------------------------
-- TABLA: PRODUCTOS
------------------------------------------------------------
CREATE TABLE Productos (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CategoriaId INT NOT NULL,
    Nombre VARCHAR(150) NOT NULL,
    Codigo VARCHAR(50) UNIQUE,
    Precio DECIMAL(10,2) NOT NULL,
    Stock INT NOT NULL DEFAULT 0,
    StockMinimo INT NOT NULL DEFAULT 0,

    FOREIGN KEY (CategoriaId) REFERENCES Categorias(Id)
);

------------------------------------------------------------
-- TABLA: PROVEEDORES
------------------------------------------------------------
CREATE TABLE Proveedores (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Nombre VARCHAR(150) NOT NULL,
    Email VARCHAR(120),
    Telefono VARCHAR(30),
    Direccion VARCHAR(200)
);

------------------------------------------------------------
-- TABLA: COMPRAS
------------------------------------------------------------
CREATE TABLE Compras (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ProveedorId INT NOT NULL,
    UsuarioId INT NOT NULL,
    Fecha DATETIME NOT NULL DEFAULT GETDATE(),
    Total DECIMAL(10,2),

    FOREIGN KEY (ProveedorId) REFERENCES Proveedores(Id),
    FOREIGN KEY (UsuarioId) REFERENCES Usuarios(Id)
);

------------------------------------------------------------
-- TABLA: COMPRAS DETALLE
------------------------------------------------------------
CREATE TABLE ComprasDetalle (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    CompraId INT NOT NULL,
    ProductoId INT NOT NULL,
    Cantidad INT NOT NULL,
    CostoUnitario DECIMAL(10,2) NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (CompraId) REFERENCES Compras(Id),
    FOREIGN KEY (ProductoId) REFERENCES Productos(Id)
);

------------------------------------------------------------
-- TABLA: VENTAS
------------------------------------------------------------
CREATE TABLE Ventas (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ClienteId INT NULL,
    UsuarioId INT NOT NULL,
    Fecha DATETIME NOT NULL DEFAULT GETDATE(),
    Total DECIMAL(10,2),

    FOREIGN KEY (ClienteId) REFERENCES Clientes(Id),
    FOREIGN KEY (UsuarioId) REFERENCES Usuarios(Id)
);

------------------------------------------------------------
-- TABLA: VENTAS DETALLE
------------------------------------------------------------
CREATE TABLE VentasDetalle (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    VentaId INT NOT NULL,
    ProductoId INT NOT NULL,
    Cantidad INT NOT NULL,
    PrecioUnitario DECIMAL(10,2) NOT NULL,
    Subtotal DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (VentaId) REFERENCES Ventas(Id),
    FOREIGN KEY (ProductoId) REFERENCES Productos(Id)
);

------------------------------------------------------------
-- TABLA: TRANSPORTE (Para delivery, env os o log stica)
------------------------------------------------------------
CREATE TABLE Transporte (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    ProveedorId INT NOT NULL,
    TipoVehiculo VARCHAR(50) NOT NULL,
    Placa VARCHAR(20),
    NombreConductor VARCHAR(100),
    Telefono VARCHAR(30),

    FOREIGN KEY (ProveedorId) REFERENCES Proveedores(Id)
);

------------------------------------------------------------
-- TABLA: ENV OS (si deseas asociar ventas con transporte)
------------------------------------------------------------
CREATE TABLE Envios (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    VentaId INT NOT NULL,
    TransporteId INT NOT NULL,
    FechaEnvio DATETIME DEFAULT GETDATE(),
    Estado VARCHAR(20) DEFAULT 'Pendiente',

    FOREIGN KEY (VentaId) REFERENCES Ventas(Id),
    FOREIGN KEY (TransporteId) REFERENCES Transporte(Id)
);

------------------------------------------------------------
-- FIN
------------------------------------------------------------
PRINT 'Base de datos VetPost creada exitosamente.';


------------------------------------------------------------
-- ROLES DE BASE DE DATOS
------------------------------------------------------------

INSERT INTO Roles (Nombre) VALUES ('Administrador'), ('Empleado');


------------------------------------------------------------
-- Script para el hash de la contraseña
------------------------------------------------------------


DECLARE @RolAdminId INT =
(
    SELECT TOP 1 Id
    FROM Roles
    WHERE Nombre = 'Administrador'
);

INSERT INTO Usuarios
(
    Username,
    NombreCompleto,
    Email,
    Telefono,
    PasswordHash,
    RolId,
    Activo
)
VALUES
(
    'admin',
    'Administrador VetPost',
    'admin@vetpost.local',
    NULL,
    '$2b$10$hQ.6o9YpYyelbnYqCQz4bea8lbSSiz0wvA6sxa7CY1LuvTEY5pgKm',
    @RolAdminId,
    1
);


------------------------------------------------------------
----------------Inventario STORAGE PROCEDURES---------------
------------------------------------------------------------




-- PROCEDIMIENTO ALMACENADO PARA LISTAR PRODUCTOS

CREATE PROCEDURE dbo.sp_Productos_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        p.Id,
        p.Nombre,
        p.Codigo,
        c.Nombre AS Categoria,
        p.Precio,
        p.Stock,
        p.StockMinimo
    FROM dbo.Productos p
    INNER JOIN dbo.Categorias c
        ON p.CategoriaId = c.Id;
END
GO


-- PROCEDIMIENTO ALMACENADO PARA OBTENER PRODUCTOS

CREATE PROCEDURE dbo.sp_Productos_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Id,
        CategoriaId,
        Nombre,
        Codigo,
        Precio,
        Stock,
        StockMinimo
    FROM dbo.Productos
    WHERE Id = @Id;
END
GO


-- PROCEDIMIENTO ALMACENADO PARA INSERTAR PRODUCTOS

CREATE PROCEDURE dbo.sp_Productos_Insertar
    @CategoriaId INT,
    @Nombre NVARCHAR(150),
    @Codigo NVARCHAR(50),
    @Precio DECIMAL(10,2),
    @Stock INT,
    @StockMinimo INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Productos
    (
        CategoriaId,
        Nombre,
        Codigo,
        Precio,
        Stock,
        StockMinimo
    )
    VALUES
    (
        @CategoriaId,
        @Nombre,
        @Codigo,
        @Precio,
        @Stock,
        @StockMinimo
    );
END
GO


-- PROCEDIMIENTO ALMACENADO PARA ACTUALIZAR PRODUCTOS

CREATE PROCEDURE dbo.sp_Productos_Actualizar
    @Id INT,
    @CategoriaId INT,
    @Nombre NVARCHAR(150),
    @Codigo NVARCHAR(50),
    @Precio DECIMAL(10,2),
    @Stock INT,
    @StockMinimo INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Productos
    SET 
        CategoriaId = @CategoriaId,
        Nombre = @Nombre,
        Codigo = @Codigo,
        Precio = @Precio,
        Stock = @Stock,
        StockMinimo = @StockMinimo
    WHERE Id = @Id;
END
GO

-- PROCEDIMIENTO ALMACENADO PARA ELIMINAR PRODUCTOS

CREATE PROCEDURE dbo.sp_Productos_Eliminar
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.Productos
    WHERE Id = @Id;
END
GO


-- PROCEDIMIENTO ALMACENADO PARA WIDGETS DE INVENTARIO
CREATE PROCEDURE dbo.sp_Productos_ResumenInventario
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        COUNT(*) AS TotalProductos,
        SUM(CASE WHEN Stock > 0 THEN 1 ELSE 0 END) AS EnStock,
        SUM(CASE WHEN Stock = 0 THEN 1 ELSE 0 END) AS Agotados,
        SUM(CASE WHEN Stock <= StockMinimo THEN 1 ELSE 0 END) AS StockBajo
    FROM dbo.Productos;
END
GO

-- INVENTARIO DE PRUEBA (NOLAN)

INSERT INTO dbo.Categorias (Nombre, Descripcion) VALUES
('Medicamentos', 'Productos veterinarios'),
('Alimentos', 'Comida para mascotas'),
('Accesorios', 'Collares y juguetes');

INSERT INTO dbo.Productos
(
    CategoriaId,
    Nombre,
    Codigo,
    Precio,
    Stock,
    StockMinimo
)
SELECT c.Id, p.Nombre, p.Codigo, p.Precio, p.Stock, p.StockMinimo
FROM (
    VALUES
    ('Medicamentos', 'Antipulgas Spray', 'MED-001', 25.00, 20, 10),
    ('Medicamentos', 'Desparasitante Oral', 'MED-002', 18.75, 15, 8),
    ('Medicamentos', 'Vacuna Triple Felina', 'MED-003', 45.00, 5, 5),

    ('Alimentos', 'Alimento Perro Adulto 10kg', 'ALI-001', 32.50, 30, 15),
    ('Alimentos', 'Alimento Gato Adulto 3kg', 'ALI-002', 16.00, 25, 10),
    ('Alimentos', 'Snack Dental Canino', 'ALI-003', 6.50, 50, 20),

    ('Accesorios', 'Collar Antipulgas', 'ACC-001', 7.50, 12, 5),
    ('Accesorios', 'Juguete Hueso', 'ACC-002', 4.25, 40, 10),
    ('Accesorios', 'Cama para Mascota Mediana', 'ACC-003', 55.00, 6, 3)
) p (Categoria, Nombre, Codigo, Precio, Stock, StockMinimo)
INNER JOIN dbo.Categorias c
    ON c.Nombre = p.Categoria;





---------------------------------------------
---------------------------------------------
-- Procedimientos almacenados para usuarios
---------------------------------------------
---------------------------------------------

-- Listas usuario

CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_Listar
AS
BEGIN
  SET NOCOUNT ON;

  SELECT u.Id, u.Username, u.NombreCompleto, u.Email, u.RolId, u.Activo,
         r.Nombre AS RolNombre
  FROM dbo.Usuarios u
  INNER JOIN dbo.Roles r ON r.Id = u.RolId
  ORDER BY u.Id DESC;
END
GO

-- Obtener usuario por ID

CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_ObtenerPorId
  @Id INT
AS
BEGIN
  SET NOCOUNT ON;

  SELECT u.Id, u.Username, u.NombreCompleto, u.Email, u.RolId, u.Activo,
         r.Nombre AS RolNombre
  FROM dbo.Usuarios u
  INNER JOIN dbo.Roles r ON r.Id = u.RolId
  WHERE u.Id = @Id;
END
GO

-- obtener usuario por username
CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_ObtenerPorUsername
  @Username NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT u.Id, u.Username, u.NombreCompleto, u.Email, u.PasswordHash, u.RolId, u.Activo,
         r.Nombre AS RolNombre
  FROM dbo.Usuarios u
  INNER JOIN dbo.Roles r ON r.Id = u.RolId
  WHERE u.Username = @Username;
END
GO

-- Insertar usuario
CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_Insertar
  @Username NVARCHAR(50),
  @NombreCompleto NVARCHAR(120),
  @Email NVARCHAR(120),
  @PasswordHash NVARCHAR(255),
    @RolId INT,
    @PreguntaSeguridad1 NVARCHAR(100) = NULL,
    @RespuestaSeguridad1 NVARCHAR(255) = NULL,
    @PreguntaSeguridad2 NVARCHAR(100) = NULL,
    @RespuestaSeguridad2 NVARCHAR(255) = NULL
AS
BEGIN
  SET NOCOUNT ON;

    INSERT INTO dbo.Usuarios (
        Username,
        NombreCompleto,
        Email,
        PasswordHash,
        RolId,
        Activo,
        PreguntaSeguridad1,
        RespuestaSeguridad1,
        PreguntaSeguridad2,
        RespuestaSeguridad2
    )
    VALUES (
        @Username,
        @NombreCompleto,
        @Email,
        @PasswordHash,
        @RolId,
        1,
        @PreguntaSeguridad1,
        @RespuestaSeguridad1,
        @PreguntaSeguridad2,
        @RespuestaSeguridad2
    );

  SELECT SCOPE_IDENTITY() AS Id;
END
GO

-- Actualizar usuario sin tocar password
CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_Actualizar
  @Id INT,
  @Username NVARCHAR(50),
  @NombreCompleto NVARCHAR(120),
  @Email NVARCHAR(120),
  @RolId INT,
  @Activo BIT
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE dbo.Usuarios
  SET Username = @Username,
      NombreCompleto = @NombreCompleto,
      Email = @Email,
      RolId = @RolId,
      Activo = @Activo
  WHERE Id = @Id;
END
GO

-- Reset de contrasena
CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_ResetPassword
  @Id INT,
  @PasswordHash NVARCHAR(255)
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE dbo.Usuarios
  SET PasswordHash = @PasswordHash
  WHERE Id = @Id;
END
GO

-- Borrado logico, activar o desactivar usuario
CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_SetActivo
  @Id INT,
  @Activo BIT
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE dbo.Usuarios
  SET Activo = @Activo
  WHERE Id = @Id;
END
GO

-- Roles, buscar y listar por nombre
CREATE OR ALTER PROCEDURE dbo.sp_Roles_Listar
AS
BEGIN
  SET NOCOUNT ON;
  SELECT Id, Nombre FROM dbo.Roles ORDER BY Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Roles_ObtenerIdPorNombre
  @Nombre NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT TOP 1 Id FROM dbo.Roles WHERE Nombre = @Nombre;
END
GO

-- Validaciones de username e email existente
CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_ExisteUsername
  @Username NVARCHAR(50)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM dbo.Usuarios WHERE Username=@Username) THEN 1 ELSE 0 END AS Existe;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Usuarios_ExisteEmail
  @Email NVARCHAR(120)
AS
BEGIN
  SET NOCOUNT ON;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM dbo.Usuarios WHERE Email=@Email) THEN 1 ELSE 0 END AS Existe;
END
GO


GO

---------------------------------------------
---------------------------------------------
-- Procedimientos almacenados para clientes
---------------------------------------------
---------------------------------------------

-- Listar clientes y mostrar cantidad mascota por cliente
GO
CREATE OR ALTER PROCEDURE dbo.sp_Clientes_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.Id,
        c.NombreCompleto,
        c.Email,
        c.Telefono,
        c.Direccion,
        COUNT(m.Id) AS CantMascotas
    FROM Clientes c
    LEFT JOIN Mascotas m ON m.ClienteId = c.Id
    GROUP BY c.Id, c.NombreCompleto, c.Email, c.Telefono, c.Direccion
    ORDER BY c.Id DESC;
END
GO

-- Insertar Cliente
GO
CREATE OR ALTER PROCEDURE dbo.sp_Clientes_Insertar
    @NombreCompleto NVARCHAR(150),
    @Email NVARCHAR(150),
    @Telefono NVARCHAR(30),
    @Direccion NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Clientes
    (NombreCompleto, Email, Telefono, Direccion)
    VALUES
    (@NombreCompleto, @Email, @Telefono, @Direccion);
END
GO

-- Eliminar Cliente
GO
CREATE OR ALTER PROCEDURE dbo.sp_Clientes_Eliminar
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.Clientes WHERE Id = @Id;
END
GO

-- Obtener Cliente
GO
CREATE OR ALTER PROCEDURE dbo.sp_Clientes_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT Id, NombreCompleto, Email, Telefono, Direccion
    FROM dbo.Clientes
    WHERE Id = @Id;
END
GO

-- Actualizar Cliente
GO
CREATE OR ALTER PROCEDURE dbo.sp_Clientes_Actualizar
    @Id INT,
    @NombreCompleto NVARCHAR(150),
    @Email NVARCHAR(150),
    @Telefono NVARCHAR(30),
    @Direccion NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Clientes
    SET NombreCompleto = @NombreCompleto,
        Email = @Email,
        Telefono = @Telefono,
        Direccion = @Direccion
    WHERE Id = @Id;
END
GO

-- Mascotas por cliente
GO
CREATE OR ALTER PROCEDURE dbo.sp_Clientes_ListarConMascotas
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.Id,
        c.NombreCompleto,
        c.Email,
        c.Telefono,
        c.Direccion,
        COUNT(m.Id) AS CantMascotas
    FROM Clientes c
    LEFT JOIN Mascotas m ON m.ClienteId = c.Id
    GROUP BY c.Id, c.NombreCompleto, c.Email, c.Telefono, c.Direccion
    ORDER BY c.Id DESC;
END
GO


---------------------------------------------
---------------------------------------------
-- Procedimientos almacenados para mascotas
---------------------------------------------
---------------------------------------------



-- Insertar Mascotas

CREATE OR ALTER PROCEDURE dbo.sp_Mascota_Insertar
    @ClienteId INT,
    @Nombre NVARCHAR(100),
    @Especie NVARCHAR(50),
    @Raza NVARCHAR(50),
    @Sexo NVARCHAR(10),
    @FechaNacimiento DATE
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Mascotas
    (
        ClienteId,
        Nombre,
        Especie,
        Raza,
        Sexo,
        FechaNacimiento
    )
    VALUES
    (
        @ClienteId,
        @Nombre,
        @Especie,
        @Raza,
        @Sexo,
        @FechaNacimiento
    );
END
GO


-- Obtener por id

CREATE OR ALTER PROCEDURE dbo.sp_Mascota_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Id,
        ClienteId,
        Nombre,
        Especie,
        Raza,
        Sexo,
        FechaNacimiento
    FROM dbo.Mascotas
    WHERE Id = @Id;
END
GO


-- Actualizar Mascotas

CREATE OR ALTER PROCEDURE dbo.sp_Mascota_Actualizar
    @Id INT,
    @ClienteId INT,
    @Nombre NVARCHAR(100),
    @Especie NVARCHAR(50),
    @Raza NVARCHAR(50),
    @Sexo NVARCHAR(10),
    @FechaNacimiento DATE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Mascotas
    SET ClienteId = @ClienteId,
        Nombre = @Nombre,
        Especie = @Especie,
        Raza = @Raza,
        Sexo = @Sexo,
        FechaNacimiento = @FechaNacimiento
    WHERE Id = @Id;
END
GO


-- Eliminar Mascotas

CREATE OR ALTER PROCEDURE dbo.sp_Mascota_Eliminar
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.Mascotas
    WHERE Id = @Id;
END
GO




------------------------------------------------------------
-- 1. Modificación de la Tabla
------------------------------------------------------------
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Mascotas') AND name = 'TieneAlergias')
BEGIN
    ALTER TABLE Mascotas 
    ADD TieneAlergias BIT CONSTRAINT DF_Mascotas_TieneAlergias DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Mascotas') AND name = 'NotasAlergias')
BEGIN
    ALTER TABLE Mascotas 
    ADD NotasAlergias NVARCHAR(MAX);
END
GO

GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Mascotas') AND name = 'Peso')
BEGIN
    ALTER TABLE Mascotas 
    ADD Peso DECIMAL(5,2);
END
GO


---------------------------------------
------Modificaciones para alergia------
---------------------------------------

CREATE OR ALTER PROCEDURE dbo.sp_Mascota_Listar
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        Id, 
        ClienteId, 
        Nombre, 
        Especie, 
        Raza, 
        Sexo, 
        FechaNacimiento,
        TieneAlergias, 
        NotasAlergias, 
        Peso           
    FROM dbo.Mascotas
    ORDER BY Id DESC; 
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Mascota_Insertar
    @ClienteId INT,
    @Nombre NVARCHAR(100),
    @Especie NVARCHAR(50),
    @Raza NVARCHAR(50),
    @Sexo NVARCHAR(10),
    @FechaNacimiento DATE,
    @TieneAlergias BIT,
    @NotasAlergias NVARCHAR(MAX),
    @Peso DECIMAL(5,2) 
AS
BEGIN
    SET NOCOUNT ON;

    IF @TieneAlergias = 1 AND (NULLIF(LTRIM(RTRIM(@NotasAlergias)), '') IS NULL)
    BEGIN
        RAISERROR('Debe especificar el alérgeno si marca que tiene alergias.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.Mascotas (
        ClienteId, Nombre, Especie, Raza, Sexo, 
        FechaNacimiento, TieneAlergias, NotasAlergias, Peso
    )
    VALUES (
        @ClienteId, @Nombre, @Especie, @Raza, @Sexo, 
        @FechaNacimiento, @TieneAlergias, @NotasAlergias, @Peso
    );
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Mascota_Actualizar
    @Id INT,
    @ClienteId INT,
    @Nombre NVARCHAR(100),
    @Especie NVARCHAR(50),
    @Raza NVARCHAR(50),
    @Sexo NVARCHAR(10),
    @FechaNacimiento DATE,
    @TieneAlergias BIT,
    @NotasAlergias NVARCHAR(MAX),
    @Peso DECIMAL(5,2) 
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Mascotas
    SET ClienteId = @ClienteId,
        Nombre = @Nombre,
        Especie = @Especie,
        Raza = @Raza,
        Sexo = @Sexo,
        FechaNacimiento = @FechaNacimiento,
        TieneAlergias = @TieneAlergias,
        NotasAlergias = @NotasAlergias,
        Peso = @Peso
    WHERE Id = @Id;
END
GO


------------------------------------------------------------
-- 1. Modificación de la Tabla Productos 02 Marzo de 26
------------------------------------------------------------

IF DB_ID('VetPostDB') IS NULL
    CREATE DATABASE VetPostDB;
GO

------------------------- Variable AMANDA -------------------------

ALTER TABLE Productos
ADD ImagenUrl NVARCHAR(500) NULL DEFAULT '';

-------------------------------------------------------------------

-- Ejecutar esto en el proyecto 

-- npm install cloudinary multer multer-storage-cloudinary


-- Procedimientos almacenados modificados

-- PROCEDIMIENTO ALMACENADO PARA LISTAR PRODUCTOS



CREATE OR ALTER PROCEDURE dbo.sp_Productos_Listar
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        p.Id,
        p.Nombre,
        p.Codigo,
        c.Nombre AS Categoria,
        p.Precio,
        p.Stock,
        p.StockMinimo,
        p.ImagenUrl
    FROM dbo.Productos p
    INNER JOIN dbo.Categorias c
        ON p.CategoriaId = c.Id;
END
GO

-- PROCEDIMIENTO ALMACENADO PARA OBTENER PRODUCTOS

CREATE OR ALTER PROCEDURE dbo.sp_Productos_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        Id,
        CategoriaId,
        Nombre,
        Codigo,
        Precio,
        Stock,
        StockMinimo,
        ImagenUrl
    FROM dbo.Productos
    WHERE Id = @Id;
END
GO

-- PROCEDIMIENTO ALMACENADO PARA INSERTAR PRODUCTOS

CREATE OR ALTER PROCEDURE dbo.sp_Productos_Insertar
    @CategoriaId INT,
    @Nombre NVARCHAR(150),
    @Codigo NVARCHAR(50),
    @Precio DECIMAL(10,2),
    @Stock INT,
    @StockMinimo INT,
    @ImagenUrl NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.Productos
    (
        CategoriaId,
        Nombre,
        Codigo,
        Precio,
        Stock,
        StockMinimo,
        ImagenUrl
    )
    VALUES
    (
        @CategoriaId,
        @Nombre,
        @Codigo,
        @Precio,
        @Stock,
        @StockMinimo,
        @ImagenUrl
    );
END
GO

-- PROCEDIMIENTO ALMACENADO PARA ACTUALIZAR PRODUCTOS

CREATE OR ALTER PROCEDURE dbo.sp_Productos_Actualizar
    @Id INT,
    @CategoriaId INT,
    @Nombre NVARCHAR(150),
    @Codigo NVARCHAR(50),
    @Precio DECIMAL(10,2),
    @Stock INT,
    @StockMinimo INT,
    @ImagenUrl NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Productos
    SET 
        CategoriaId = @CategoriaId,
        Nombre = @Nombre,
        Codigo = @Codigo,
        Precio = @Precio,
        Stock = @Stock,
        StockMinimo = @StockMinimo,
        ImagenUrl = ISNULL(@ImagenUrl, ImagenUrl)
    WHERE Id = @Id;
END
GO



------- 10/3/2026 - AMANDA - PROVEEDORES -------

-- =============================================
-- 1. Agregar ProveedorId a la tabla Productos
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Productos') AND name = 'ProveedorId')
BEGIN
    ALTER TABLE dbo.Productos 
    ADD ProveedorId INT NULL;

    ALTER TABLE dbo.Productos 
    ADD CONSTRAINT FK_Productos_Proveedores 
    FOREIGN KEY (ProveedorId) REFERENCES dbo.Proveedores(Id);
END
GO

-- =============================================
-- 2. PROCEDIMIENTOS PARA PROVEEDORES (CRUD)
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_Proveedores_Listar
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Nombre, Email, Telefono, Direccion
    FROM dbo.Proveedores
    ORDER BY Id DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Proveedores_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, Nombre, Email, Telefono, Direccion
    FROM dbo.Proveedores
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Proveedores_Insertar
    @Nombre NVARCHAR(150),
    @Email NVARCHAR(120),
    @Telefono NVARCHAR(30),
    @Direccion NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.Proveedores (Nombre, Email, Telefono, Direccion)
    VALUES (@Nombre, @Email, @Telefono, @Direccion);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Proveedores_Actualizar
    @Id INT,
    @Nombre NVARCHAR(150),
    @Email NVARCHAR(120),
    @Telefono NVARCHAR(30),
    @Direccion NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Proveedores
    SET Nombre = @Nombre,
        Email = @Email,
        Telefono = @Telefono,
        Direccion = @Direccion
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Proveedores_Eliminar
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM dbo.Proveedores WHERE Id = @Id;
END
GO

-- =============================================
-- 3. ACTUALIZAR PROCEDIMIENTOS DE PRODUCTOS (ahora soportan ProveedorId)
-- =============================================
CREATE OR ALTER PROCEDURE dbo.sp_Productos_Listar
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        p.Id, p.Nombre, p.Codigo, c.Nombre AS Categoria,
        p.Precio, p.Stock, p.StockMinimo, p.ImagenUrl,
        ISNULL(prov.Nombre, 'Sin proveedor asignado') AS Proveedor
    FROM dbo.Productos p
    INNER JOIN dbo.Categorias c ON p.CategoriaId = c.Id
    LEFT JOIN dbo.Proveedores prov ON p.ProveedorId = prov.Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Productos_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, CategoriaId, Nombre, Codigo, Precio, Stock, StockMinimo, ImagenUrl, ProveedorId
    FROM dbo.Productos
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Productos_Insertar
    @CategoriaId INT,
    @Nombre NVARCHAR(150),
    @Codigo NVARCHAR(50),
    @Precio DECIMAL(10,2),
    @Stock INT,
    @StockMinimo INT,
    @ImagenUrl NVARCHAR(500) = NULL,
    @ProveedorId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO dbo.Productos (CategoriaId, Nombre, Codigo, Precio, Stock, StockMinimo, ImagenUrl, ProveedorId)
    VALUES (@CategoriaId, @Nombre, @Codigo, @Precio, @Stock, @StockMinimo, @ImagenUrl, @ProveedorId);
END
GO

CREATE OR ALTER PROCEDURE dbo.sp_Productos_Actualizar
    @Id INT,
    @CategoriaId INT,
    @Nombre NVARCHAR(150),
    @Codigo NVARCHAR(50),
    @Precio DECIMAL(10,2),
    @Stock INT,
    @StockMinimo INT,
    @ImagenUrl NVARCHAR(500) = NULL,
    @ProveedorId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.Productos
    SET CategoriaId = @CategoriaId,
        Nombre = @Nombre,
        Codigo = @Codigo,
        Precio = @Precio,
        Stock = @Stock,
        StockMinimo = @StockMinimo,
        ImagenUrl = ISNULL(@ImagenUrl, ImagenUrl),
        ProveedorId = ISNULL(@ProveedorId, ProveedorId)
    WHERE Id = @Id;
END
GO

-- =============================================
-- 4. Datos de prueba
-- =============================================
INSERT INTO dbo.Proveedores (Nombre, Email, Telefono, Direccion) VALUES
('VetSupply CR', 'info@vetsupply.cr', '22224444', 'Alajuela, Costa Rica'),
('Mascotas Pro', 'ventas@mascotaspro.com', '24445555', 'Heredia, Costa Rica'),
('Farmacia Animal', 'contacto@farmaciaanimal.cr', '22998877', 'San José, Costa Rica');
GO

-- Asignar un proveedor por defecto a los productos existentes
UPDATE dbo.Productos 
SET ProveedorId = (SELECT TOP 1 Id FROM Proveedores ORDER BY Id)
WHERE ProveedorId IS NULL;
GO

-----------------Añadir proveedor a la lista de productos-----------------

CREATE OR ALTER PROCEDURE dbo.sp_Productos_Listar
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        p.Id, p.Nombre, p.Codigo, c.Nombre AS Categoria,
        p.Precio, p.Stock, p.StockMinimo, p.ImagenUrl,
        p.ProveedorId,
        ISNULL(prov.Nombre, 'Sin proveedor') AS Proveedor
    FROM dbo.Productos p
    INNER JOIN dbo.Categorias c ON p.CategoriaId = c.Id
    LEFT JOIN dbo.Proveedores prov ON p.ProveedorId = prov.Id;
END



------- 11/3/2026 - AMANDA - Citas y Transporte para Grooming -------

USE VetPostDB;
GO

-- 1. Asegurar columnas necesarias en Citas
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Citas') AND name = 'TransporteNecesario')
BEGIN
    ALTER TABLE Citas ADD TransporteNecesario BIT DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Citas') AND name = 'TransporteId')
BEGIN
    ALTER TABLE Citas ADD TransporteId INT NULL;
    ALTER TABLE Citas ADD CONSTRAINT FK_Citas_Transporte FOREIGN KEY (TransporteId) REFERENCES Transporte(Id);
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Citas') AND name = 'TipoTransporte')
BEGIN
    ALTER TABLE Citas ADD TipoTransporte VARCHAR(20) NULL;  -- 'Ida', 'Vuelta', 'Ambos'
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Citas') AND name = 'CostoGrooming')
BEGIN
    ALTER TABLE Citas ADD CostoGrooming DECIMAL(10,2) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Citas') AND name = 'CostoTransporte')
BEGIN
    ALTER TABLE Citas ADD CostoTransporte DECIMAL(10,2) NULL;
END
GO

-- 2. Asegurar Provincia en Clientes (para calcular costo transporte GAM)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Clientes') AND name = 'Provincia')
BEGIN
    ALTER TABLE Clientes ADD Provincia VARCHAR(50) NULL;  -- ej: 'San José', 'Heredia', etc.
END
GO

-- 3. PROCEDIMIENTOS PARA CITAS

-- Listar citas con filtros
CREATE OR ALTER PROCEDURE sp_Citas_Listar
    @FechaInicio DATE = NULL,
    @FechaFin DATE = NULL,
    @ClienteId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.Id,
        c.MascotaId,
        m.Nombre AS MascotaNombre,
        m.Peso,
        cl.NombreCompleto AS ClienteNombre,
        cl.Provincia,
        c.UsuarioId,
        u.NombreCompleto AS Veterinario,
        c.Fecha,
        c.Hora,
        c.Servicio,
        c.Estado,
        c.TransporteNecesario,
        c.TipoTransporte,
        c.TransporteId,
        t.NombreConductor AS Conductor,
        t.Telefono AS TelefonoTransporte,
        c.CostoGrooming,
        c.CostoTransporte,
        (ISNULL(c.CostoGrooming, 0) + ISNULL(c.CostoTransporte, 0)) AS Total
    FROM Citas c
    INNER JOIN Mascotas m ON c.MascotaId = m.Id
    INNER JOIN Clientes cl ON m.ClienteId = cl.Id
    INNER JOIN Usuarios u ON c.UsuarioId = u.Id
    LEFT JOIN Transporte t ON c.TransporteId = t.Id
    WHERE (@FechaInicio IS NULL OR c.Fecha >= @FechaInicio)
      AND (@FechaFin IS NULL OR c.Fecha <= @FechaFin)
      AND (@ClienteId IS NULL OR cl.Id = @ClienteId)
    ORDER BY c.Fecha DESC, c.Hora DESC;
END
GO

-- Obtener cita por ID (para editar)
CREATE OR ALTER PROCEDURE sp_Citas_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.*,
        m.Peso,
        cl.Provincia,
        cl.Id AS ClienteId,
        m.Id AS MascotaId
    FROM Citas c
    INNER JOIN Mascotas m ON c.MascotaId = m.Id
    INNER JOIN Clientes cl ON m.ClienteId = cl.Id
    WHERE c.Id = @Id;
END
GO

-- Insertar cita (con todos los cálculos y validaciones al 100%)
CREATE OR ALTER PROCEDURE sp_Citas_Insertar
    @MascotaId INT,
    @UsuarioId INT = 1,               -- Veterinario fijo (admin por defecto)
    @Fecha DATE,
    @Hora TIME,
    @Servicio VARCHAR(100) = 'Grooming',
    @TransporteNecesario BIT = 0,
    @TipoTransporte VARCHAR(20) = NULL,  -- 'Ida', 'Vuelta', 'Ambos'
    @TransporteId INT = NULL,
    @Provincia VARCHAR(50)            -- De la tabla Clientes
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Validar que el servicio sea Grooming (por ahora solo ese)
    IF @Servicio <> 'Grooming'
    BEGIN
        RAISERROR('Actualmente solo se soporta el servicio de Grooming.', 16, 1);
        RETURN;
    END

    -- 2. Validar horario del veterinario (no solapamiento ±60 min)
    IF EXISTS (
        SELECT 1 FROM Citas
        WHERE UsuarioId = @UsuarioId
          AND Fecha = @Fecha
          AND ABS(DATEDIFF(MINUTE, Hora, @Hora)) < 60
    )
    BEGIN
        RAISERROR('El horario seleccionado ya está ocupado para el veterinario.', 16, 1);
        RETURN;
    END

    -- 3. Si requiere transporte, validar datos obligatorios
    IF @TransporteNecesario = 1
    BEGIN
        IF @TransporteId IS NULL OR @TipoTransporte NOT IN ('Ida', 'Vuelta', 'Ambos')
        BEGIN
            RAISERROR('Debe seleccionar un transporte válido y el tipo (Ida/Vuelta/Ambos).', 16, 1);
            RETURN;
        END

        -- 4. Validar disponibilidad del transporte (±30 min)
        IF EXISTS (
            SELECT 1 FROM Citas
            WHERE TransporteId = @TransporteId
              AND Fecha = @Fecha
              AND ABS(DATEDIFF(MINUTE, Hora, @Hora)) <= 30
        )
        BEGIN
            RAISERROR('El transporte seleccionado no está disponible en ese horario (±30 min).', 16, 1);
            RETURN;
        END
    END

    -- 5. Validar peso de mascota (debe existir y ser >0)
    DECLARE @Peso DECIMAL(5,2);
    SELECT @Peso = Peso FROM Mascotas WHERE Id = @MascotaId;
    IF @Peso IS NULL OR @Peso <= 0
    BEGIN
        RAISERROR('La mascota debe tener un peso registrado mayor a 0 para calcular el costo de grooming.', 16, 1);
        RETURN;
    END

    -- 6. Calcular costo grooming según peso
    DECLARE @CostoGrooming DECIMAL(10,2) = CASE
        WHEN @Peso <= 2 THEN 7000
        WHEN @Peso <= 4 THEN 10000
        WHEN @Peso <= 7 THEN 13000
        WHEN @Peso <= 10 THEN 16000
        ELSE 20000
    END;

    -- 7. Calcular costo transporte según provincia
    DECLARE @CostoTransporte DECIMAL(10,2) = 0;
    IF @TransporteNecesario = 1
    BEGIN
        IF @Provincia IS NULL
        BEGIN
            RAISERROR('La provincia del cliente es requerida para calcular el costo de transporte.', 16, 1);
            RETURN;
        END

        SET @CostoTransporte = CASE
            WHEN @Provincia IN ('San José', 'Heredia', 'Alajuela', 'Cartago') THEN 10000
            ELSE 25000
        END;
    END

    -- 8. Insertar la cita
    INSERT INTO Citas (
        MascotaId, UsuarioId, Fecha, Hora, Servicio, Estado,
        TransporteNecesario, TipoTransporte, TransporteId,
        CostoGrooming, CostoTransporte
    )
    VALUES (
        @MascotaId, @UsuarioId, @Fecha, @Hora, @Servicio, 'Pendiente',
        @TransporteNecesario, @TipoTransporte, @TransporteId,
        @CostoGrooming, @CostoTransporte
    );

    -- Retornar el ID de la nueva cita
    SELECT SCOPE_IDENTITY() AS Id;
END
GO

-- Actualizar cita (solo campos editables: fecha, hora, estado, transporte)
CREATE OR ALTER PROCEDURE sp_Citas_Actualizar
    @Id INT,
    @Fecha DATE = NULL,
    @Hora TIME = NULL,
    @Estado VARCHAR(20) = NULL,
    @TransporteNecesario BIT = NULL,
    @TipoTransporte VARCHAR(20) = NULL,
    @TransporteId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Re-validar si se cambia fecha/hora/transporte
    DECLARE @UsuarioId INT, @FechaNueva DATE, @HoraNueva TIME;
    SELECT @UsuarioId = UsuarioId, @FechaNueva = ISNULL(@Fecha, Fecha), @HoraNueva = ISNULL(@Hora, Hora)
    FROM Citas WHERE Id = @Id;

    IF EXISTS (
        SELECT 1 FROM Citas
        WHERE Id <> @Id
          AND UsuarioId = @UsuarioId
          AND Fecha = @FechaNueva
          AND ABS(DATEDIFF(MINUTE, Hora, @HoraNueva)) < 60
    )
    BEGIN
        RAISERROR('El nuevo horario ya está ocupado para el veterinario.', 16, 1);
        RETURN;
    END

    IF ISNULL(@TransporteNecesario, (SELECT TransporteNecesario FROM Citas WHERE Id = @Id)) = 1 
       AND ISNULL(@TransporteId, (SELECT TransporteId FROM Citas WHERE Id = @Id)) > 0
    BEGIN
        IF EXISTS (
            SELECT 1 FROM Citas
            WHERE Id <> @Id
              AND TransporteId = @TransporteId
              AND Fecha = @FechaNueva
              AND ABS(DATEDIFF(MINUTE, Hora, @HoraNueva)) <= 30
        )
        BEGIN
            RAISERROR('El transporte no está disponible en el nuevo horario.', 16, 1);
            RETURN;
        END
    END

    UPDATE Citas
    SET Fecha = ISNULL(@Fecha, Fecha),
        Hora = ISNULL(@Hora, Hora),
        Estado = ISNULL(@Estado, Estado),
        TransporteNecesario = ISNULL(@TransporteNecesario, TransporteNecesario),
        TipoTransporte = ISNULL(@TipoTransporte, TipoTransporte),
        TransporteId = ISNULL(@TransporteId, TransporteId)
    WHERE Id = @Id;
END
GO

-- 4. PROCEDIMIENTOS PARA TRANSPORTE

CREATE OR ALTER PROCEDURE sp_Transporte_Listar
AS
BEGIN
    SET NOCOUNT ON;
    SELECT t.*, p.Nombre AS Proveedor
    FROM Transporte t
    INNER JOIN Proveedores p ON t.ProveedorId = p.Id
    ORDER BY t.Id DESC;
END
GO

CREATE OR ALTER PROCEDURE sp_Transporte_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT * FROM Transporte WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Transporte_Insertar
    @ProveedorId INT,
    @TipoVehiculo VARCHAR(50),
    @Placa VARCHAR(20),
    @NombreConductor VARCHAR(100),
    @Telefono VARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO Transporte (ProveedorId, TipoVehiculo, Placa, NombreConductor, Telefono)
    VALUES (@ProveedorId, @TipoVehiculo, @Placa, @NombreConductor, @Telefono);
END
GO

CREATE OR ALTER PROCEDURE sp_Transporte_Actualizar
    @Id INT,
    @ProveedorId INT,
    @TipoVehiculo VARCHAR(50),
    @Placa VARCHAR(20),
    @NombreConductor VARCHAR(100),
    @Telefono VARCHAR(30)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE Transporte
    SET ProveedorId = @ProveedorId,
        TipoVehiculo = @TipoVehiculo,
        Placa = @Placa,
        NombreConductor = @NombreConductor,
        Telefono = @Telefono
    WHERE Id = @Id;
END
GO

-- Verificar disponibilidad de transporte en rango horario
CREATE OR ALTER PROCEDURE sp_Transporte_VerificarDisponibilidad
    @Fecha DATE,
    @Hora TIME
AS
BEGIN
    SET NOCOUNT ON;

    -- Buscar citas con transporte en ventana de ±30 min
    SELECT COUNT(*) AS Conflictos
    FROM Citas c
    WHERE c.TransporteNecesario = 1
      AND c.Fecha = @Fecha
      AND ABS(DATEDIFF(MINUTE, c.Hora, @Hora)) <= 30;
END
GO

---------------- MODIFICACIONES PARA CORREGIR TRANSPORTE 13/3/2026 AMANDA ------------

-- 1. Eliminar FK con Proveedores (ya no se necesita)
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_Citas_Transporte')
BEGIN
    ALTER TABLE Citas DROP CONSTRAINT FK_Citas_Transporte;
END
GO
-- mantenimiento de bd
IF EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK__Transport__Prove__6477ECF3')
BEGIN
    ALTER TABLE Transporte DROP CONSTRAINT FK__Transport__Prove__6477ECF3;
END
GO

-- 2. Quitar columna ProveedorId de Transporte (ya no existe proveedor)
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Transporte') AND name = 'ProveedorId')
BEGIN
    ALTER TABLE Transporte DROP COLUMN ProveedorId;
END
GO

-- 3. Asegurar que solo haya 1 transportista (borrar extras si hay)
DELETE FROM Transporte WHERE Id > 1;
GO

-- 4. Crear/actualizar el único transportista (ejemplo)
IF NOT EXISTS (SELECT * FROM Transporte WHERE Id = 1)
BEGIN
    INSERT INTO Transporte (TipoVehiculo, Placa, NombreConductor, Telefono)
    VALUES ('Camioneta', 'ABC-123', 'Juan Pérez', '88881234');
END
ELSE
BEGIN
    UPDATE Transporte SET 
        TipoVehiculo = 'Camioneta',
        Placa = 'ABC-123',
        NombreConductor = 'Juan Pérez',
        Telefono = '88881234'
    WHERE Id = 1;
END
GO

-- 5. SP para listar el único transportista + sus citas
CREATE OR ALTER PROCEDURE sp_Transporte_ListarConCitas
AS
BEGIN
    SET NOCOUNT ON;

    -- Datos del transportista (solo 1)
    SELECT TOP 1 
        Id,
        TipoVehiculo,
        Placa,
        NombreConductor,
        Telefono
    FROM Transporte
    ORDER BY Id;

    -- Citas asignadas (solo las que necesitan transporte)
    SELECT 
        c.Id AS CitaId,
        c.Fecha,
        c.Hora,
        c.TipoTransporte,
        cl.Direccion AS DireccionCliente,
        c.CostoTransporte
    FROM Citas c
    INNER JOIN Mascotas m ON c.MascotaId = m.Id
    INNER JOIN Clientes cl ON m.ClienteId = cl.Id
    WHERE c.TransporteNecesario = 1
      AND c.TransporteId = 1  -- El único transportista
    ORDER BY c.Fecha DESC, c.Hora DESC;
END
GO

--- Correccion para visualizar el error en el overlap de tiempos

  CREATE OR ALTER PROCEDURE sp_Citas_Actualizar
    @Id INT,
    @Fecha DATE = NULL,
    @Hora TIME = NULL,
    @Estado VARCHAR(20) = NULL,
    @TransporteNecesario BIT = NULL,
    @TipoTransporte VARCHAR(20) = NULL,
    @TransporteId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UsuarioId INT, @FechaNueva DATE, @HoraNueva TIME;
    SELECT @UsuarioId = UsuarioId, 
           @FechaNueva = ISNULL(@Fecha, Fecha), 
           @HoraNueva  = ISNULL(@Hora, Hora)
    FROM Citas WHERE Id = @Id;

    IF EXISTS (
        SELECT 1 FROM Citas
        WHERE Id <> @Id
          AND UsuarioId = @UsuarioId
          AND Fecha = @FechaNueva
          AND ABS(DATEDIFF(MINUTE, Hora, @HoraNueva)) < 60
    )
    BEGIN
        RAISERROR('CONFLICTO_VETERINARIO', 16, 1);
        RETURN;
    END

    IF ISNULL(@TransporteNecesario, (SELECT TransporteNecesario FROM Citas WHERE Id = @Id)) = 1 
       AND ISNULL(@TransporteId, (SELECT TransporteId FROM Citas WHERE Id = @Id)) > 0
    BEGIN
        IF EXISTS (
            SELECT 1 FROM Citas
            WHERE Id <> @Id
              AND TransporteId = ISNULL(@TransporteId, (SELECT TransporteId FROM Citas WHERE Id = @Id))
              AND Fecha = @FechaNueva
              AND ABS(DATEDIFF(MINUTE, Hora, @HoraNueva)) <= 30
        )
        BEGIN
            RAISERROR('CONFLICTO_TRANSPORTE', 16, 1);
            RETURN;
        END
    END

    UPDATE Citas
    SET Fecha               = ISNULL(@Fecha, Fecha),
        Hora                = ISNULL(@Hora, Hora),
        Estado              = ISNULL(@Estado, Estado),
        TransporteNecesario = ISNULL(@TransporteNecesario, TransporteNecesario),
        TipoTransporte      = ISNULL(@TipoTransporte, TipoTransporte),
        TransporteId        = ISNULL(@TransporteId, TransporteId)
    WHERE Id = @Id;
END
GO


-- Corregir el tiempo de validacion entre citas dependiendo si esta en GAM o no:

CREATE OR ALTER PROCEDURE sp_Citas_Actualizar
    @Id INT,
    @Fecha DATE = NULL,
    @Hora TIME = NULL,
    @Estado VARCHAR(20) = NULL,
    @TransporteNecesario BIT = NULL,
    @TipoTransporte VARCHAR(20) = NULL,
    @TransporteId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UsuarioId        INT;
    DECLARE @FechaNueva       DATE;
    DECLARE @HoraNueva        TIME;
    DECLARE @Provincia        VARCHAR(50);
    DECLARE @MinutosBloqueo   INT;
    DECLARE @TransporteActual INT;

    -- Obtener datos actuales + provincia del cliente
    SELECT
        @UsuarioId        = c.UsuarioId,
        @FechaNueva       = ISNULL(@Fecha, c.Fecha),
        @HoraNueva        = ISNULL(@Hora,  c.Hora),
        @Provincia        = cl.Provincia,
        @TransporteActual = c.TransporteId
    FROM Citas c
    INNER JOIN Mascotas m  ON c.MascotaId = m.Id
    INNER JOIN Clientes cl ON m.ClienteId = cl.Id
    WHERE c.Id = @Id;

    -- 1. Validar conflicto con veterinario (60 min siempre)
    IF EXISTS (
        SELECT 1 FROM Citas
        WHERE Id <> @Id
          AND UsuarioId = @UsuarioId
          AND Fecha = @FechaNueva
          AND ABS(DATEDIFF(MINUTE, Hora, @HoraNueva)) < 60
    )
    BEGIN
        RAISERROR('CONFLICTO_VETERINARIO', 16, 1);
        RETURN;
    END

    -- 2. Validar conflicto de transporte si la cita usa transporte
    DECLARE @UsaTransporte      BIT = ISNULL(@TransporteNecesario,
                                        (SELECT TransporteNecesario FROM Citas WHERE Id = @Id));
    DECLARE @TransporteEfectivo INT = ISNULL(@TransporteId, @TransporteActual);

    IF @UsaTransporte = 1 AND @TransporteEfectivo IS NOT NULL
    BEGIN
        SET @MinutosBloqueo = CASE
            WHEN @Provincia IN ('San José', 'Heredia', 'Alajuela', 'Cartago') THEN 60
            ELSE 150
        END;

        IF EXISTS (
            SELECT 1 FROM Citas c2
            INNER JOIN Mascotas m2  ON c2.MascotaId = m2.Id
            INNER JOIN Clientes cl2 ON m2.ClienteId = cl2.Id
            WHERE c2.Id <> @Id
              AND c2.TransporteId = @TransporteEfectivo
              AND c2.TransporteNecesario = 1
              AND c2.Fecha = @FechaNueva
              AND ABS(DATEDIFF(MINUTE, c2.Hora, @HoraNueva)) < @MinutosBloqueo
        )
        BEGIN
            RAISERROR('CONFLICTO_TRANSPORTE', 16, 1);
            RETURN;
        END
    END

    -- 3. Actualizar
    UPDATE Citas
    SET Fecha               = ISNULL(@Fecha,               Fecha),
        Hora                = ISNULL(@Hora,                Hora),
        Estado              = ISNULL(@Estado,              Estado),
        TransporteNecesario = ISNULL(@TransporteNecesario, TransporteNecesario),
        TipoTransporte      = ISNULL(@TipoTransporte,      TipoTransporte),
        TransporteId        = ISNULL(@TransporteId,        TransporteId)
    WHERE Id = @Id;
END
GO

CREATE OR ALTER PROCEDURE sp_Citas_Insertar
    @MascotaId INT,
    @UsuarioId INT = 1,
    @Fecha DATE,
    @Hora TIME,
    @Servicio VARCHAR(100) = 'Grooming',
    @TransporteNecesario BIT = 0,
    @TipoTransporte VARCHAR(20) = NULL,
    @TransporteId INT = NULL,
    @Provincia VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @MinutosBloqueo INT;

    -- 1. Validar que el servicio sea Grooming
    IF @Servicio <> 'Grooming'
    BEGIN
        RAISERROR('SERVICIO_INVALIDO', 16, 1);
        RETURN;
    END

    -- 2. Validar horario del veterinario (no solapamiento 60 min)
    IF EXISTS (
        SELECT 1 FROM Citas
        WHERE UsuarioId = @UsuarioId
          AND Fecha = @Fecha
          AND ABS(DATEDIFF(MINUTE, Hora, @Hora)) < 60
    )
    BEGIN
        RAISERROR('CONFLICTO_VETERINARIO', 16, 1);
        RETURN;
    END

    -- 3. Validar transporte si es necesario
    IF @TransporteNecesario = 1
    BEGIN
        IF @TransporteId IS NULL OR @TipoTransporte NOT IN ('Ida', 'Vuelta', 'Ambos')
        BEGIN
            RAISERROR('TRANSPORTE_DATOS_INVALIDOS', 16, 1);
            RETURN;
        END

        -- Calcular bloqueo según provincia (GAM vs fuera)
        SET @MinutosBloqueo = CASE
            WHEN @Provincia IN ('San José', 'Heredia', 'Alajuela', 'Cartago') THEN 60
            ELSE 150
        END;

        IF EXISTS (
            SELECT 1 FROM Citas c2
            INNER JOIN Mascotas m2  ON c2.MascotaId = m2.Id
            INNER JOIN Clientes cl2 ON m2.ClienteId = cl2.Id
            WHERE c2.TransporteId = @TransporteId
              AND c2.TransporteNecesario = 1
              AND c2.Fecha = @Fecha
              AND ABS(DATEDIFF(MINUTE, c2.Hora, @Hora)) < @MinutosBloqueo
        )
        BEGIN
            RAISERROR('CONFLICTO_TRANSPORTE', 16, 1);
            RETURN;
        END
    END

    -- 4. Validar peso de mascota
    DECLARE @Peso DECIMAL(5,2);
    SELECT @Peso = Peso FROM Mascotas WHERE Id = @MascotaId;
    IF @Peso IS NULL OR @Peso <= 0
    BEGIN
        RAISERROR('MASCOTA_SIN_PESO', 16, 1);
        RETURN;
    END

    -- 5. Calcular costo grooming según peso
    DECLARE @CostoGrooming DECIMAL(10,2) = CASE
        WHEN @Peso <= 2  THEN 7000
        WHEN @Peso <= 4  THEN 10000
        WHEN @Peso <= 7  THEN 13000
        WHEN @Peso <= 10 THEN 16000
        ELSE 20000
    END;

    -- 6. Calcular costo transporte según provincia
    DECLARE @CostoTransporte DECIMAL(10,2) = 0;
    IF @TransporteNecesario = 1
    BEGIN
        IF @Provincia IS NULL
        BEGIN
            RAISERROR('PROVINCIA_REQUERIDA', 16, 1);
            RETURN;
        END

        SET @CostoTransporte = CASE
            WHEN @Provincia IN ('San José', 'Heredia', 'Alajuela', 'Cartago') THEN 10000
            ELSE 25000
        END;
    END

    -- 7. Insertar la cita
    INSERT INTO Citas (
        MascotaId, UsuarioId, Fecha, Hora, Servicio, Estado,
        TransporteNecesario, TipoTransporte, TransporteId,
        CostoGrooming, CostoTransporte
    )
    VALUES (
        @MascotaId, @UsuarioId, @Fecha, @Hora, @Servicio, 'Pendiente',
        @TransporteNecesario, @TipoTransporte, @TransporteId,
        @CostoGrooming, @CostoTransporte
    );

    SELECT SCOPE_IDENTITY() AS Id;
END
GO

---------- COMO NO SE PUEDEN AGREGAR HASTA QUE ESTE PV, AGREGANDO DATOS DE PRUEBA EN BD ----------
-- =============================================
-- LIMPIEZA TOTAL
-- =============================================
DELETE FROM Citas;
DELETE FROM Transporte;
DELETE FROM Mascotas;
DELETE FROM Clientes;
GO

DBCC CHECKIDENT ('Clientes',   RESEED, 0);
DBCC CHECKIDENT ('Mascotas',   RESEED, 0);
DBCC CHECKIDENT ('Citas',      RESEED, 0);
DBCC CHECKIDENT ('Transporte', RESEED, 0);
GO

-- =============================================
-- CLIENTES: 5 dentro del GAM (IDs 1-5)
-- =============================================
INSERT INTO Clientes (NombreCompleto, Email, Telefono, Direccion, Provincia) VALUES
('Ana María Rojas',      'ana.rojas@email.com',      '88881234', 'San Pedro, Montes de Oca',  'San José'),
('Carlos Eduardo Gómez', 'carlos.gomez@email.com',   '87776543', 'Heredia centro',             'Heredia'),
('Laura Fernández',      'laura.fdz@email.com',      '86665432', 'Alajuela, Desamparados',     'Alajuela'),
('Roberto Jiménez',      'roberto.jim@email.com',    '85554321', 'Cartago, Paraíso',           'Cartago'),
('Valeria Mora',         'valeria.mora@email.com',   '84443210', 'Escazú, San Rafael',         'San José');
GO

-- =============================================
-- CLIENTES: 5 fuera del GAM (IDs 6-10)
-- =============================================
INSERT INTO Clientes (NombreCompleto, Email, Telefono, Direccion, Provincia) VALUES
('Diego Solano',         'diego.solano@email.com',   '83332109', 'Liberia, Guanacaste',        'Guanacaste'),
('Mariela Brenes',       'mariela.brenes@email.com', '82221098', 'Puntarenas centro',          'Puntarenas'),
('Andrés Quesada',       'andres.quesada@email.com', '81110987', 'Ciudad Quesada, San Carlos', 'Alajuela Norte'),
('Natalia Vega',         'natalia.vega@email.com',   '80009876', 'Pérez Zeledón, San Isidro',  'San José Sur'),
('Fernando Chaves',      'fernando.chaves@email.com','79998765', 'Limón centro',               'Limón');
GO

-- =============================================
-- MASCOTAS: 1 por cliente (IDs 1-10)
-- =============================================
INSERT INTO Mascotas (ClienteId, Nombre, Especie, Raza, Sexo, FechaNacimiento, Peso, TieneAlergias, NotasAlergias) VALUES
-- GAM
(1,  'Luna',   'Perro', 'Labrador',         'Hembra', '2023-05-15', 8.5,  0, NULL),               -- grooming 16.000
(2,  'Max',    'Gato',  'Persa',             'Macho',  '2024-01-10', 4.2,  1, 'Alergia al pollo'), -- grooming 10.000
(3,  'Rocky',  'Perro', 'Bulldog',           'Macho',  '2022-11-20', 12.0, 0, NULL),               -- grooming 20.000
(4,  'Bella',  'Perro', 'Golden Retriever',  'Hembra', '2023-08-03', 1.8,  0, NULL),               -- grooming  7.000
(5,  'Simba',  'Gato',  'Siamés',            'Macho',  '2024-02-28', 5.5,  0, NULL),               -- grooming 13.000
-- Fuera GAM
(6,  'Canela', 'Perro', 'Beagle',            'Hembra', '2022-07-11', 9.0,  0, NULL),               -- grooming 16.000
(7,  'Thor',   'Perro', 'Rottweiler',        'Macho',  '2021-03-22', 15.0, 1, 'Alergia al maíz'), -- grooming 20.000
(8,  'Mía',    'Gato',  'Maine Coon',        'Hembra', '2023-11-05', 3.1,  0, NULL),               -- grooming 10.000
(9,  'Bruno',  'Perro', 'Dálmata',           'Macho',  '2022-09-17', 6.8,  0, NULL),               -- grooming 13.000
(10, 'Nina',   'Perro', 'Chihuahua',         'Hembra', '2024-04-01', 1.5,  0, NULL);               -- grooming  7.000
GO

-- =============================================
-- TRANSPORTISTA ÚNICO (Id 1)
-- =============================================
INSERT INTO Transporte (TipoVehiculo, Placa, NombreConductor, Telefono) VALUES
('Camioneta', 'ABC-123', 'Juan Pérez', '88881234');
GO

-- =============================================
-- CITAS: 10 ejemplos
-- 5 clientes GAM  → 3 sin transporte, 2 con transporte
-- 5 clientes fuera GAM → 2 sin transporte, 3 con transporte
-- Horas separadas para no generar conflictos entre sí
-- =============================================
INSERT INTO Citas (MascotaId, UsuarioId, Fecha, Hora, Servicio, Estado, TransporteNecesario, TipoTransporte, TransporteId, CostoGrooming, CostoTransporte)
VALUES
-- GAM sin transporte
(1, 1, '2026-03-24', '08:00:00', 'Grooming', 'Pendiente',  0, NULL,    NULL, 16000,  0),
(3, 1, '2026-03-25', '10:00:00', 'Grooming', 'Confirmada', 0, NULL,    NULL, 20000,  0),
(5, 1, '2026-03-26', '09:00:00', 'Grooming', 'Pendiente',  0, NULL,    NULL, 13000,  0),
-- GAM con transporte (bloqueo 1h → citas separadas 60+ min)
(2, 1, '2026-03-27', '08:00:00', 'Grooming', 'Pendiente',  1, 'Ambos', 1,   10000, 10000),
(4, 1, '2026-03-27', '11:00:00', 'Grooming', 'Confirmada', 1, 'Ida',   1,    7000, 10000),

-- Fuera GAM sin transporte
(6, 1, '2026-03-28', '08:00:00', 'Grooming', 'Pendiente',  0, NULL,    NULL, 16000,  0),
(8, 1, '2026-03-29', '10:00:00', 'Grooming', 'Pendiente',  0, NULL,    NULL, 10000,  0),
-- Fuera GAM con transporte (bloqueo 2h30 → citas separadas 150+ min)
(7,  1, '2026-03-30', '08:00:00', 'Grooming', 'Pendiente',  1, 'Ambos', 1,  20000, 25000),
(9,  1, '2026-03-30', '11:00:00', 'Grooming', 'Confirmada', 1, 'Vuelta',1,  13000, 25000),
(10, 1, '2026-03-31', '08:00:00', 'Grooming', 'Pendiente',  1, 'Ida',   1,   7000, 25000);
GO

-- =============================================
-- VERIFICACIÓN
-- =============================================
SELECT 'Clientes GAM:'      AS Seccion; SELECT * FROM Clientes WHERE Provincia IN ('San José','Heredia','Alajuela','Cartago') ORDER BY Id;
SELECT 'Clientes fuera GAM:'AS Seccion; SELECT * FROM Clientes WHERE Provincia NOT IN ('San José','Heredia','Alajuela','Cartago') ORDER BY Id;
SELECT 'Mascotas:'          AS Seccion; SELECT * FROM Mascotas ORDER BY Id;
SELECT 'Transporte:'        AS Seccion; SELECT * FROM Transporte;
SELECT 'Citas:'             AS Seccion; SELECT * FROM Citas ORDER BY Id;
GO

EXEC sp_Transporte_ListarConCitas;
GO


-- 12/03/2026 - BITACORA DE AUDITORIA (ADMIN) Aaron

IF OBJECT_ID('dbo.TiposEventoLog', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.TiposEventoLog (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Codigo VARCHAR(60) NOT NULL UNIQUE,
        Nombre VARCHAR(150) NOT NULL
    );
END
GO

IF OBJECT_ID('dbo.LogAuditoria', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.LogAuditoria (
        Id BIGINT IDENTITY(1,1) PRIMARY KEY,
        Fecha DATETIME NOT NULL DEFAULT GETDATE(),
        TipoEventoId INT NOT NULL,
        ActorUsuarioId INT NULL,
        UsuarioAfectadoId INT NULL,
        Detalle NVARCHAR(300) NULL,
        Ip NVARCHAR(45) NULL,
        DatosJson NVARCHAR(MAX) NULL,
        CONSTRAINT FK_LogAuditoria_TipoEvento FOREIGN KEY (TipoEventoId) REFERENCES dbo.TiposEventoLog(Id),
        CONSTRAINT FK_LogAuditoria_Actor FOREIGN KEY (ActorUsuarioId) REFERENCES dbo.Usuarios(Id),
        CONSTRAINT FK_LogAuditoria_UsuarioAfectado FOREIGN KEY (UsuarioAfectadoId) REFERENCES dbo.Usuarios(Id)
    );

    CREATE INDEX IX_LogAuditoria_Fecha ON dbo.LogAuditoria(Fecha DESC);
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'USR_REGISTRO_CUENTA')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('USR_REGISTRO_CUENTA', 'Registro de cuenta (empleado)');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'USR_ALTA_ADMIN')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('USR_ALTA_ADMIN', 'Alta de administrador');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'USR_ALTA_EMPLEADO')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('USR_ALTA_EMPLEADO', 'Alta de empleado por admin');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'USR_EDITADO')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('USR_EDITADO', 'Edición de usuario');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'USR_CAMBIO_ROL')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('USR_CAMBIO_ROL', 'Cambio de rol de usuario');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'USR_ACTIVADO')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('USR_ACTIVADO', 'Usuario activado');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'USR_DESACTIVADO')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('USR_DESACTIVADO', 'Usuario desactivado');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'USR_RESET_PASSWORD')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('USR_RESET_PASSWORD', 'Reseteo de contraseña');

IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'CLI_CREADO')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('CLI_CREADO', 'Cliente creado');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'CLI_EDITADO')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('CLI_EDITADO', 'Cliente editado');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'CLI_ELIMINADO')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('CLI_ELIMINADO', 'Cliente eliminado');

IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'USR_LOGIN')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('USR_LOGIN', 'Inicio de sesión');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'USR_LOGOUT')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('USR_LOGOUT', 'Cierre de sesión');
GO

---------------------------aaron termina 12.03.2026---------------------

--- Aaron 14/03/2026 


------------------------------------------------------------
-- TABLA: MOVIMIENTOS DE INVENTARIO
------------------------------------------------------------
IF OBJECT_ID('dbo.Movimientos', 'U') IS NULL
BEGIN
    CREATE TABLE Movimientos (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Fecha DATETIME NOT NULL DEFAULT GETDATE(),
        Tipo VARCHAR(50) NOT NULL,
        ProductoId INT NOT NULL,
        Cantidad INT NOT NULL,
        UsuarioId INT NULL,
        Detalle NVARCHAR(250) NULL,
        StockPrevio INT NULL,
        StockNuevo INT NULL,

        FOREIGN KEY (ProductoId) REFERENCES Productos(Id),
        FOREIGN KEY (UsuarioId) REFERENCES Usuarios(Id)
    );

    CREATE INDEX IX_Movimientos_Fecha ON Movimientos(Fecha DESC);
    CREATE INDEX IX_Movimientos_ProductoId ON Movimientos(ProductoId);
END;


IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'REP_VER_PANEL')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('REP_VER_PANEL', 'Acceso al panel de reportes');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'REP_VER_HISTORIAL')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('REP_VER_HISTORIAL', 'Consulta de historial de inventario');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'REP_FILTRAR_HISTORIAL')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('REP_FILTRAR_HISTORIAL', 'Filtrado de historial de inventario');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'REP_VER_BITACORA')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('REP_VER_BITACORA', 'Consulta de bitácora del sistema');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'REP_GENERAR_REPORTE')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('REP_GENERAR_REPORTE', 'Generación de reporte');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'REP_EXPORTAR_PDF')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('REP_EXPORTAR_PDF', 'Exportación de reporte en PDF');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'REP_EXPORTAR_EXCEL')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('REP_EXPORTAR_EXCEL', 'Exportación de reporte en Excel');
IF NOT EXISTS (SELECT 1 FROM dbo.TiposEventoLog WHERE Codigo = 'REP_IMPRIMIR')
    INSERT INTO dbo.TiposEventoLog (Codigo, Nombre) VALUES ('REP_IMPRIMIR', 'Impresión de reporte');
GO



----------aaron termina 14.03.2026---------------------


---------------------------Andres 16.03.2026---------------------

USE VetPostDB;
GO

-- =============================================
-- PROVEEDORES REALES
-- =============================================

SET IDENTITY_INSERT dbo.Proveedores ON;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Proveedores WHERE Id = 4)
BEGIN
    INSERT INTO dbo.Proveedores (Id, Nombre, Email, Telefono, Direccion)
    VALUES
    (
        4,
        'Aquasu',
        'aaquasu@gmail.com',
        '62706886',
        'Concovas, Provincia de Cartago, Paraíso, Costa Rica. Abrir en Waze. 4001 0238'
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Proveedores WHERE Id = 5)
BEGIN
    INSERT INTO dbo.Proveedores (Id, Nombre, Email, Telefono, Direccion)
    VALUES
    (
        5,
        'Kapuchiti Funny Pets',
        'Kapuchitifunnypets@gmail.com',
        '84036001',
        'Zapote San Jose, Costa Rica'
    );
END
GO

SET IDENTITY_INSERT dbo.Proveedores OFF;
GO

DBCC CHECKIDENT ('dbo.Proveedores', RESEED, 5);
GO

-- =============================================
-- IDs NECESARIOS
-- =============================================

DECLARE @CategoriaAccesoriosId INT;
DECLARE @ProveedorAquasuId INT;
DECLARE @ProveedorKapuchitiId INT;

SELECT TOP 1 @CategoriaAccesoriosId = Id
FROM dbo.Categorias
WHERE Nombre = 'Accesorios';

SELECT TOP 1 @ProveedorAquasuId = Id
FROM dbo.Proveedores
WHERE Nombre = 'Aquasu';

SELECT TOP 1 @ProveedorKapuchitiId = Id
FROM dbo.Proveedores
WHERE Nombre = 'Kapuchiti Funny Pets';

IF @CategoriaAccesoriosId IS NULL
BEGIN
    RAISERROR('No existe la categoría Accesorios en dbo.Categorias.', 16, 1);
    RETURN;
END

IF @ProveedorAquasuId IS NULL
BEGIN
    RAISERROR('No existe el proveedor Aquasu en dbo.Proveedores.', 16, 1);
    RETURN;
END

IF @ProveedorKapuchitiId IS NULL
BEGIN
    RAISERROR('No existe el proveedor Kapuchiti Funny Pets en dbo.Proveedores.', 16, 1);
    RETURN;
END

-- =============================================
-- PRODUCTOS AQUASU
-- =============================================

IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Codigo = '1908')
BEGIN
    INSERT INTO dbo.Productos
    (
        CategoriaId, Nombre, Codigo, Precio, Stock, StockMinimo, ImagenUrl, ProveedorId
    )
    VALUES
    (
        @CategoriaAccesoriosId,
        'Removedor de Olores Dophin',
        '1908',
        5100.00,
        5,
        2,
        'https://res.cloudinary.com/dvvmqwvlb/image/upload/v1773709926/vetpos_productos/p99fyvxbf2gzs3xsbgcn.png',
        @ProveedorAquasuId
    );
END

IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Codigo = '1751-A')
BEGIN
    INSERT INTO dbo.Productos
    (
        CategoriaId, Nombre, Codigo, Precio, Stock, StockMinimo, ImagenUrl, ProveedorId
    )
    VALUES
    (
        @CategoriaAccesoriosId,
        'Correa con Harness',
        '1751-A',
        5015.00,
        10,
        3,
        'https://res.cloudinary.com/dvvmqwvlb/image/upload/v1773710019/vetpos_productos/ghfaybezq568ar8qusu3.png',
        @ProveedorAquasuId
    );
END

IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Codigo = '1278')
BEGIN
    INSERT INTO dbo.Productos
    (
        CategoriaId, Nombre, Codigo, Precio, Stock, StockMinimo, ImagenUrl, ProveedorId
    )
    VALUES
    (
        @CategoriaAccesoriosId,
        'Pechera reflectiva',
        '1278',
        5850.00,
        10,
        3,
        'https://res.cloudinary.com/dvvmqwvlb/image/upload/v1773710074/vetpos_productos/n7kiwhbu0avm8ypdz9gq.png',
        @ProveedorAquasuId
    );
END

IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Codigo = '1205')
BEGIN
    INSERT INTO dbo.Productos
    (
        CategoriaId, Nombre, Codigo, Precio, Stock, StockMinimo, ImagenUrl, ProveedorId
    )
    VALUES
    (
        @CategoriaAccesoriosId,
        'Collar Snoopy',
        '1205',
        550.00,
        10,
        3,
        'https://res.cloudinary.com/dvvmqwvlb/image/upload/v1773710115/vetpos_productos/g9cb91mgjpvtvzpguda5.png',
        @ProveedorAquasuId
    );
END

-- =============================================
-- PRODUCTOS KAPUCHITI FUNNY PETS
-- =============================================

IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Codigo = 'AD20202')
BEGIN
    INSERT INTO dbo.Productos
    (
        CategoriaId, Nombre, Codigo, Precio, Stock, StockMinimo, ImagenUrl, ProveedorId
    )
    VALUES
    (
        @CategoriaAccesoriosId,
        'Comedero Acero color 22cm',
        'AD20202',
        2540.00,
        7,
        3,
        'https://res.cloudinary.com/dvvmqwvlb/image/upload/v1773715601/vetpos_productos/zmoeixnisxvqbtefhfg5.png',
        @ProveedorKapuchitiId
    );
END

IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Codigo = 'AD14042')
BEGIN
    INSERT INTO dbo.Productos
    (
        CategoriaId, Nombre, Codigo, Precio, Stock, StockMinimo, ImagenUrl, ProveedorId
    )
    VALUES
    (
        @CategoriaAccesoriosId,
        'Fuente de agua para mascotas',
        'AD14042',
        9500.00,
        10,
        3,
        'https://res.cloudinary.com/dvvmqwvlb/image/upload/v1773715655/vetpos_productos/ylzhgbgsrzysk006mqgo.png',
        @ProveedorKapuchitiId
    );
END

IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Codigo = 'MX-241')
BEGIN
    INSERT INTO dbo.Productos
    (
        CategoriaId, Nombre, Codigo, Precio, Stock, StockMinimo, ImagenUrl, ProveedorId
    )
    VALUES
    (
        @CategoriaAccesoriosId,
        'Cinturon de seguridad 2.5x80cm',
        'MX-241',
        2255.00,
        15,
        5,
        'https://res.cloudinary.com/dvvmqwvlb/image/upload/v1773715704/vetpos_productos/pieg2bvnyoqneng9vj8t.png',
        @ProveedorKapuchitiId
    );
END

IF NOT EXISTS (SELECT 1 FROM dbo.Productos WHERE Codigo = 'AD23104')
BEGIN
    INSERT INTO dbo.Productos
    (
        CategoriaId, Nombre, Codigo, Precio, Stock, StockMinimo, ImagenUrl, ProveedorId
    )
    VALUES
    (
        @CategoriaAccesoriosId,
        'Bebedero para pajaro 375 ml',
        'AD23104',
        2115.00,
        5,
        2,
        'https://res.cloudinary.com/dvvmqwvlb/image/upload/v1773715545/vetpos_productos/o0pad6jad2b6tfqaemoc.png',
        @ProveedorKapuchitiId
    );
END
GO

-- =============================================
-- VERIFICACIÓN FINAL
-- =============================================

SELECT 
    p.Id,
    p.Nombre,
    p.Codigo,
    p.Precio,
    p.Stock,
    p.StockMinimo,
    c.Nombre AS Categoria,
    pr.Nombre AS Proveedor,
    p.ImagenUrl
FROM dbo.Productos p
INNER JOIN dbo.Categorias c ON p.CategoriaId = c.Id
LEFT JOIN dbo.Proveedores pr ON p.ProveedorId = pr.Id
WHERE pr.Nombre IN ('Aquasu', 'Kapuchiti Funny Pets')
ORDER BY pr.Nombre, p.Id;
GO

---------------------------Andres Fin 16.03.2026---------------------



---------------------------Nolan comienza 18.03.2026---------------------

CREATE OR ALTER PROCEDURE dbo.sp_Ventas_BuscarProductos
    @Termino NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT 
        p.Id, 
        p.Nombre, 
        p.Codigo,
        p.Precio, 
        p.Stock, 
        p.StockMinimo,
        p.ImagenUrl,
        c.Nombre AS Categoria,
        CASE 
            WHEN p.Stock <= p.StockMinimo THEN 1 
            ELSE 0 
        END AS EsCritico
    FROM dbo.Productos p
    INNER JOIN dbo.Categorias c ON p.CategoriaId = c.Id
    WHERE (p.Nombre LIKE '%' + @Termino + '%' OR p.Codigo = @Termino)
    AND p.Stock > -100
    ORDER BY p.Nombre;
END
GO



CREATE OR ALTER PROCEDURE dbo.sp_Ventas_ProcesarVenta
    @ClienteId INT,
    @UsuarioId INT,
    @Total DECIMAL(10,2),
    @DetalleJSON NVARCHAR(MAX) 
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @VentaId INT;
        INSERT INTO dbo.Ventas (ClienteId, UsuarioId, Fecha, Total)
        VALUES (NULLIF(@ClienteId, 0), @UsuarioId, GETDATE(), @Total);

        SET @VentaId = SCOPE_IDENTITY();
        INSERT INTO dbo.VentasDetalle (VentaId, ProductoId, Cantidad, PrecioUnitario, Subtotal)
        SELECT 
            @VentaId, 
            ProductoId, 
            Cantidad, 
            Precio, 
            (Cantidad * Precio)
        FROM OPENJSON(@DetalleJSON)
        WITH (
            ProductoId INT,
            Cantidad INT,
            Precio DECIMAL(10,2)
        );
        UPDATE p
        SET p.Stock = p.Stock - d.Cantidad
        FROM dbo.Productos p
        INNER JOIN (
            SELECT ProductoId, Cantidad 
            FROM OPENJSON(@DetalleJSON)
            WITH (ProductoId INT, Cantidad INT)
        ) d ON p.Id = d.ProductoId;

        COMMIT TRANSACTION;
        SELECT @VentaId AS VentaId;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
    END CATCH
END
GO


CREATE OR ALTER PROCEDURE dbo.sp_Ventas_ListarClientesPOS
AS
BEGIN
    SET NOCOUNT ON;
    SELECT Id, NombreCompleto, Telefono, Provincia
    FROM dbo.Clientes
    ORDER BY NombreCompleto;
END
GO
---------------------------Nolan Fin 18.03.2026---------------------



---------------------------Amanda ARREGLOS FINALES comienza 4.04.2026---------------------
------------------------------------------------------------
-- SP: Dashboard - Resumen de tarjetas (ventas hoy, citas hoy,
--     productos bajos en stock, total mascotas)
------------------------------------------------------------
CREATE OR ALTER PROCEDURE sp_Dashboard_Resumen
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        -- Ventas del día (suma de totales de ventas de hoy)
        ISNULL(
            (SELECT SUM(Total) FROM Ventas WHERE CONVERT(date, Fecha) = CONVERT(date, GETDATE())),
        0) AS VentasHoy,

        -- Citas agendadas para hoy
        ISNULL(
            (SELECT COUNT(*) FROM Citas WHERE Fecha = CONVERT(date, GETDATE())),
        0) AS CitasHoy,

        -- Productos con stock igual o menor al mínimo
        ISNULL(
            (SELECT COUNT(*) FROM Productos WHERE Stock <= StockMinimo),
        0) AS ProductosBajoStock,

        -- Total de mascotas registradas en el sistema
        ISNULL(
            (SELECT COUNT(*) FROM Mascotas),
        0) AS TotalMascotas;
END
GO

------------------------------------------------------------
-- SP: Dashboard - Citas de hoy con detalle para la tabla
------------------------------------------------------------
CREATE OR ALTER PROCEDURE sp_Dashboard_CitasHoy
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.Id,
        c.Hora,
        cl.NombreCompleto   AS ClienteNombre,
        m.Nombre            AS MascotaNombre,
        m.Especie,
        c.Servicio,
        c.Estado
    FROM Citas c
    INNER JOIN Mascotas m  ON c.MascotaId  = m.Id
    INNER JOIN Clientes cl ON m.ClienteId  = cl.Id
    WHERE c.Fecha = CONVERT(date, GETDATE())
    ORDER BY c.Hora ASC;
END
GO


-- ── sp_Citas_Insertar ─────────────────────────────────────────────
CREATE OR ALTER PROCEDURE sp_Citas_Insertar
    @MascotaId INT,
    @UsuarioId INT = 1,
    @Fecha DATE,
    @Hora TIME,
    @Servicio VARCHAR(100) = 'Grooming',
    @TransporteNecesario BIT = 0,
    @TipoTransporte VARCHAR(20) = NULL,
    @TransporteId INT = NULL,
    @Provincia VARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Validar servicio
    IF @Servicio <> 'Grooming'
        RAISERROR('SERVICIO_INVALIDO', 16, 1);

    -- 2. Validar transporte
    IF @TransporteNecesario = 1
    BEGIN
        IF @TransporteId IS NULL OR @TipoTransporte NOT IN ('Ida', 'Vuelta', 'Ambos')
            RAISERROR('TRANSPORTE_DATOS_INVALIDOS', 16, 1);
    END

    -- 3. Validar peso mascota
    DECLARE @Peso DECIMAL(5,2);
    SELECT @Peso = Peso FROM Mascotas WHERE Id = @MascotaId;
    IF @Peso IS NULL OR @Peso = 0
        RAISERROR('MASCOTA_SIN_PESO', 16, 1);

    -- 4. Validar conflicto veterinario (60 min)
    IF EXISTS (
        SELECT 1 FROM Citas
        WHERE UsuarioId = @UsuarioId
          AND Fecha = @Fecha
          AND Estado NOT IN ('Cancelada')
          AND ABS(DATEDIFF(MINUTE, Hora, @Hora)) < 60
    )
        RAISERROR('CONFLICTO_VETERINARIO', 16, 1);

    -- 5. Validar conflicto transporte
    IF @TransporteNecesario = 1
    BEGIN
        DECLARE @BloqueoMinutos INT;
        SET @BloqueoMinutos = CASE
            WHEN @Provincia IN ('San José', 'Heredia', 'Alajuela', 'Cartago') THEN 60
            ELSE 150
        END;

        IF EXISTS (
            SELECT 1 FROM Citas
            WHERE TransporteId = @TransporteId
              AND Fecha = @Fecha
              AND Estado NOT IN ('Cancelada')
              AND ABS(DATEDIFF(MINUTE, Hora, @Hora)) < @BloqueoMinutos
        )
            RAISERROR('CONFLICTO_TRANSPORTE', 16, 1);
    END

    -- 6. Calcular costo grooming por peso
    DECLARE @CostoGrooming DECIMAL(10,2);
    SET @CostoGrooming = CASE
        WHEN @Peso <= 5  THEN 7000
        WHEN @Peso <= 15 THEN 10000
        WHEN @Peso <= 30 THEN 13000
        ELSE 20000
    END;

    -- 7. Calcular costo transporte ── CORREGIDO: Ambos = x2
    DECLARE @CostoTransporte DECIMAL(10,2) = 0;
    IF @TransporteNecesario = 1
    BEGIN
        IF @Provincia IS NULL
            RAISERROR('PROVINCIA_REQUERIDA', 16, 1);

        DECLARE @TarifaBase DECIMAL(10,2);
        SET @TarifaBase = CASE
            WHEN @Provincia IN ('San José', 'Heredia', 'Alajuela', 'Cartago') THEN 10000
            ELSE 25000
        END;

        SET @CostoTransporte = CASE
            WHEN @TipoTransporte = 'Ambos' THEN @TarifaBase * 2
            ELSE @TarifaBase
        END;
    END

    -- 8. Insertar
    INSERT INTO Citas (
        MascotaId, UsuarioId, Fecha, Hora, Servicio, Estado,
        TransporteNecesario, TipoTransporte, TransporteId,
        CostoGrooming, CostoTransporte
    )
    VALUES (
        @MascotaId, @UsuarioId, @Fecha, @Hora, @Servicio, 'Pendiente',
        @TransporteNecesario, @TipoTransporte, @TransporteId,
        @CostoGrooming, @CostoTransporte
    );
END
GO

---------------------------Amanda Fin 04.04.2026---------------------


---------------------------Aaron 6.04.2026 - OLVIDE CONTRASEÑA CON PREGUNTAS SEGURIDAD---------------------

-- 1. Agregar columnas para preguntas de seguridad en Usuarios
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'PreguntaSeguridad1')
BEGIN
    ALTER TABLE Usuarios ADD PreguntaSeguridad1 VARCHAR(100) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'RespuestaSeguridad1')
BEGIN
    ALTER TABLE Usuarios ADD RespuestaSeguridad1 VARCHAR(255) NULL;  -- Hash de la respuesta
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'PreguntaSeguridad2')
BEGIN
    ALTER TABLE Usuarios ADD PreguntaSeguridad2 VARCHAR(100) NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'RespuestaSeguridad2')
BEGIN
    ALTER TABLE Usuarios ADD RespuestaSeguridad2 VARCHAR(255) NULL;  -- Hash de la respuesta
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'IntentosRecuperacion')
BEGIN
    ALTER TABLE Usuarios ADD IntentosRecuperacion INT DEFAULT 0;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Usuarios') AND name = 'UltimoIntentoRecuperacion')
BEGIN
    ALTER TABLE Usuarios ADD UltimoIntentoRecuperacion DATETIME NULL;
END
GO

-- 2. SP para validar respuestas de seguridad y permitir reseteo
CREATE OR ALTER PROCEDURE sp_Usuarios_ValidarRespuestasSeguridad
    @Username NVARCHAR(50),
    @Respuesta1 NVARCHAR(255),
    @Respuesta2 NVARCHAR(255),
    @Resultado INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserId INT;
    DECLARE @RespuestaHasheada1 VARCHAR(255);
    DECLARE @RespuestaHasheada2 VARCHAR(255);
    DECLARE @RespuestaAlmacenada1 VARCHAR(255);
    DECLARE @RespuestaAlmacenada2 VARCHAR(255);
    DECLARE @IntentosActuales INT;
    DECLARE @UltimoIntento DATETIME;
    DECLARE @TiempoTranscurrido INT;

    -- Buscar usuario
    SELECT @UserId = Id, 
           @IntentosActuales = IntentosRecuperacion,
           @UltimoIntento = UltimoIntentoRecuperacion,
           @RespuestaAlmacenada1 = RespuestaSeguridad1,
           @RespuestaAlmacenada2 = RespuestaSeguridad2
    FROM dbo.Usuarios 
    WHERE Username = @Username;

    IF @UserId IS NULL
    BEGIN
        SET @Resultado = 0;  -- Usuario no existe
        RETURN;
    END

    -- Rate limiting: Máx 3 intentos, bloqueo de 15 minutos
    IF @IntentosActuales >= 3 AND @UltimoIntento IS NOT NULL
    BEGIN
        SET @TiempoTranscurrido = DATEDIFF(MINUTE, @UltimoIntento, GETDATE());
        IF @TiempoTranscurrido < 15
        BEGIN
            SET @Resultado = 3;  -- Bloqueado temporalmente
            RETURN;
        END
        ELSE
        BEGIN
            UPDATE dbo.Usuarios SET IntentosRecuperacion = 0, UltimoIntentoRecuperacion = NULL WHERE Id = @UserId;
            SET @IntentosActuales = 0;
        END
    END

    -- Normalizar respuestas (minúsculas, sin espacios extras)
    DECLARE @Resp1Norm NVARCHAR(255) = LOWER(TRIM(@Respuesta1));
    DECLARE @Resp2Norm NVARCHAR(255) = LOWER(TRIM(@Respuesta2));

    -- Hash simple para comparación (en producción usar bcrypt)
    SET @RespuestaHasheada1 = LOWER(TRIM(@Respuesta1));
    SET @RespuestaHasheada2 = LOWER(TRIM(@Respuesta2));

    -- Validar respuestas
    IF (@RespuestaAlmacenada1 = @RespuestaHasheada1) AND (@RespuestaAlmacenada2 = @RespuestaHasheada2)
    BEGIN
        -- Respuestas correctas: resetear intentos y retornar éxito
        UPDATE dbo.Usuarios SET IntentosRecuperacion = 0, UltimoIntentoRecuperacion = NULL WHERE Id = @UserId;
        SET @Resultado = 1;  -- Éxito
        RETURN;
    END
    ELSE
    BEGIN
        -- Incrementar intentos fallidos
        UPDATE dbo.Usuarios 
        SET IntentosRecuperacion = IntentosRecuperacion + 1,
            UltimoIntentoRecuperacion = GETDATE()
        WHERE Id = @UserId;
        SET @Resultado = 2;  -- Respuestas incorrectas
        RETURN;
    END
END
GO

-- 3. SP para resetear contraseña después de validar preguntas
CREATE OR ALTER PROCEDURE sp_Usuarios_ResetearContraseña
    @Username NVARCHAR(50),
    @NuevaContraseñaHash VARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Usuarios 
    SET PasswordHash = @NuevaContraseñaHash,
        IntentosRecuperacion = 0,
        UltimoIntentoRecuperacion = NULL
    WHERE Username = @Username;

    IF @@ROWCOUNT > 0
    BEGIN
        -- Registrar en auditoría
        INSERT INTO dbo.LogAuditoria (TipoEventoId, ActorUsuarioId, UsuarioAfectadoId, Detalle, Ip)
        SELECT 
            (SELECT Id FROM dbo.TiposEventoLog WHERE Codigo = 'USR_RESET_PASSWORD'),
            NULL,
            Id,
            'Reseteo de contraseña via preguntas de seguridad',
            NULL
        FROM dbo.Usuarios WHERE Username = @Username;

        SELECT 1 AS Exitoso;
    END
    ELSE
    BEGIN
        SELECT 0 AS Exitoso;
    END
END
GO

-- 4. SP para obtener preguntas de seguridad de un usuario
CREATE OR ALTER PROCEDURE sp_Usuarios_ObtenerPreguntasSeguridad
    @Username NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        PreguntaSeguridad1,
        PreguntaSeguridad2
    FROM dbo.Usuarios 
    WHERE Username = @Username AND Activo = 1;
END
GO

-- 5. Preguntas de seguridad predefinidas (referencia)
CREATE OR ALTER PROCEDURE sp_ObtenerPreguntasDisponibles
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        'Nombre de tu primera mascota' AS Pregunta,
        'mascota' AS Tipo
    UNION ALL
    SELECT 'Marca de tu primer auto', 'auto';
END
GO

---------------------------Aaron Fin 6.04.2026---------------------