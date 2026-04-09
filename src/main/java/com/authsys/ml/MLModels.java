package com.authsys.ml;

import java.util.*;

public class MLModels {
    // Feature vector: [failed_count, login_freq, unique_ips, session_interval]
    public static double logisticRegression(double[] weights, double[] features) {
        double z = weights[0]; // bias
        for (int i = 0; i < features.length; i++) {
            z += weights[i + 1] * features[i];
        }
        return 1.0 / (1.0 + Math.exp(-z));
    }

    public static int randomForest(List<List<Double>> trees, double[] features) {
        List<Integer> votes = new ArrayList<>();
        for (List<Double> tree : trees) {
            votes.add(simpleDecisionTree(tree, features));
        }
        return mode(votes);
    }

    // Simple stub for a decision tree: threshold on first feature
    private static int simpleDecisionTree(List<Double> tree, double[] features) {
        // For demo: tree.get(0) = threshold, tree.get(1) = if <= threshold, tree.get(2) = if > threshold
        return features[0] <= tree.get(0) ? tree.get(1).intValue() : tree.get(2).intValue();
    }

    private static int mode(List<Integer> votes) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int v : votes) count.put(v, count.getOrDefault(v, 0) + 1);
        return Collections.max(count.entrySet(), Map.Entry.comparingByValue()).getKey();
    }
}
