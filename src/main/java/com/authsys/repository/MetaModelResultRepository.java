package com.authsys.repository;

import com.authsys.model.MetaModelResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MetaModelResultRepository extends JpaRepository<MetaModelResult, Long> {
    // Additional query methods if needed
}
