package com.authsys.repository;

import com.authsys.model.UnsupervisedModelResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UnsupervisedModelResultRepository extends JpaRepository<UnsupervisedModelResult, Long> {
}
