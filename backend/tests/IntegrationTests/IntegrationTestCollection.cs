namespace RealEstateErp.IntegrationTests;

/// <summary>
/// All integration test classes share one CustomWebApplicationFactory instance and run
/// sequentially (never in parallel) — they hit the same Postgres test database, and starting
/// multiple hosts concurrently races on EF migrations/seeding against that one database.
/// </summary>
[CollectionDefinition("Integration")]
public class IntegrationTestCollection : ICollectionFixture<CustomWebApplicationFactory>
{
}
