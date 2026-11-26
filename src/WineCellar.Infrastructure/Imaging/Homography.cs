namespace WineCellar.Infrastructure.Imaging;

/// <summary>
/// Projective mapping (homography) between two quadrilaterals: 3x3 matrix [a b c; d e f; g h 1] that maps
/// (x, y) to ((a x + b y + c) / (g x + h y + 1), (d x + e y + f) / (g x + h y + 1)).
/// </summary>
public static class Homography
{
    /// <summary>The 9 matrix entries (row-major) that map each source point onto the matching destination point.</summary>
    public static double[] FromPoints(IReadOnlyList<(double X, double Y)> source, IReadOnlyList<(double X, double Y)> destination)
    {
        if (source.Count != 4 || destination.Count != 4) throw new ArgumentException("Exactly four point pairs are needed.");

        // 8 equations, 8 unknowns (a..h); for each pair:
        //   a x + b y + c - g x X - h y X = X
        //   d x + e y + f - g x Y - h y Y = Y
        var m = new double[8, 9];
        for (var i = 0; i < 4; i++)
        {
            var (x, y) = source[i];
            var (u, v) = destination[i];
            var r = 2 * i;
            m[r, 0] = x; m[r, 1] = y; m[r, 2] = 1; m[r, 6] = -x * u; m[r, 7] = -y * u; m[r, 8] = u;
            m[r + 1, 3] = x; m[r + 1, 4] = y; m[r + 1, 5] = 1; m[r + 1, 6] = -x * v; m[r + 1, 7] = -y * v; m[r + 1, 8] = v;
        }

        // Gaussian elimination with partial pivoting.
        for (var col = 0; col < 8; col++)
        {
            var pivot = col;
            for (var row = col + 1; row < 8; row++)
                if (Math.Abs(m[row, col]) > Math.Abs(m[pivot, col])) pivot = row;
            if (Math.Abs(m[pivot, col]) < 1e-12) throw new ArgumentException("The points do not form a valid quadrilateral.");
            if (pivot != col)
                for (var k = col; k < 9; k++) (m[col, k], m[pivot, k]) = (m[pivot, k], m[col, k]);

            for (var row = 0; row < 8; row++)
            {
                if (row == col) continue;
                var factor = m[row, col] / m[col, col];
                if (factor == 0) continue;
                for (var k = col; k < 9; k++) m[row, k] -= factor * m[col, k];
            }
        }

        var h = new double[9];
        for (var i = 0; i < 8; i++) h[i] = m[i, 8] / m[i, i];
        h[8] = 1;
        return h;
    }

    public static (double X, double Y) Map(double[] h, double x, double y)
    {
        var w = h[6] * x + h[7] * y + h[8];
        return ((h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w);
    }
}
