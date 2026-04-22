import java.util.Random;

public class scratch {
    private static final Random random = new Random();

    public static double addLaplaceNoise(double value, double epsilon) {
        double sensitivity = 1.0;
        double scale = sensitivity / epsilon;
        double u = 0.5 - random.nextDouble();
        return value + scale * Math.signum(u) * Math.log(1 - 2 * Math.abs(u));
    }

    public static void main(String[] args) {
        System.out.println("Testing epsilons on 10,000 users:");
        for (double eps : new double[]{50.0, 100.0, 150.0, 200.0, 300.0, 400.0}) {
            int flips = 0;
            for (int i=0; i<10000; i++) {
                double prob = 0.080; // High end of normal user
                double noisy = addLaplaceNoise(prob, eps);
                if (noisy >= 0.1) flips++;
            }
            System.out.println("Epsilon " + eps + " flipped " + flips + "/10000 normal users (prob 0.08) to False Positive");
        }
    }
}
