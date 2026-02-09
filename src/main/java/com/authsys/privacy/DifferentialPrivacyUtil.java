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
}
