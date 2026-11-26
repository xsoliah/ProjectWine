namespace WineCellar.Domain;

/// <summary>A business rule was violated. Messages are user-facing (German).</summary>
public class DomainException(string message) : Exception(message);
