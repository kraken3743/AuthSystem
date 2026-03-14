package com.authsys.privacy;

import java.util.Random;

public class DifferentialPrivacyUtil {

    private static final Random random = new Random();

    // Laplace noise mechanism
    public static double addLaplaceNoise(double value, double epsilon) {

        double sensitivity = 1.0;
        double scale = sensitivity / epsilon;

        double u = 0.5 - random.nextDouble();
        return value + scale * Math.signum(u) * Math.log(1 - 2 * Math.abs(u));
    }

    // Gaussian noise mechanism
    public static double addGaussianNoise(double value, double epsilon, double delta) {
        double sensitivity = 1.0;
        // Standard deviation for Gaussian mechanism
        double sigma = Math.sqrt(2 * Math.log(1.25 / delta)) * sensitivity / epsilon;
        return value + random.nextGaussian() * sigma;
    }

    // Z-Score based anomaly detection
    public static double computeZScore(double value, double mean, double stddev) {
        if (stddev == 0) return 0;
        return (value - mean) / stddev;
    }
}
