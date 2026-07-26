// SPDX-FileCopyrightText: 2025 Weibo, Inc.
//
// SPDX-License-Identifier: Apache-2.0

pluginManagement {
    resolutionStrategy {
        eachPlugin {
            when (requested.id.id) {
                // IntelliJ Platform 2025.3 bundles Kotlin 2.2.20 metadata.
                "org.jetbrains.kotlin.jvm" -> useVersion("2.2.20")

                // 2025.3 unified IntelliJ distributions require 2.10.4 or newer.
                "org.jetbrains.intellij.platform" -> useVersion("2.10.4")
            }
        }
    }
}

rootProject.name = "Kilo Code"
